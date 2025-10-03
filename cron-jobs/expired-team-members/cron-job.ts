import { DateTime } from 'luxon';
import { Between } from 'typeorm';
import axios from 'axios';
import { CronJobDataSource } from '../data-source';
import { Entitlement } from '../../apps/api-server/src/modules/subscription/domain/entitlement.enum';
import { TeamToMember } from '../../apps/api-server/src/modules/team/entities/team-to-member.entity';
import { Team } from '../../apps/api-server/src/modules/team/entities/team.entity';
import { PaymentType } from '../../apps/api-server/src/modules/team/domain/payment-type.enum';
import { runCronWithTelemetry, captureErrorWithContext } from '../sentry';
import { withTimeout } from '../../apps/api-server/src/shared/utils/helpers';
import { CRON_JOB_TIMEOUT_MS } from '../../apps/api-server/src/shared/utils/constants';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

async function getMembersWhoseTrialExpired() {
  const sevenDaysAgo = DateTime.local().minus({ days: 7 }).toJSDate();
  const endOfCurrentDay = DateTime.local().endOf('day').toJSDate();
  // get users whose team membership expires on current date
  const expiredMembers = await CronJobDataSource.manager.find(TeamToMember, {
    where: { member_expiry_date: Between(sevenDaysAgo, endOfCurrentDay) },
  });
  return expiredMembers;
}

async function updateTeamSubscriptionQuantity(team: Team, linkedMemberRecords: TeamToMember[]) {
  const newTeamMemberCount = linkedMemberRecords.length - 1;
  try {
    const subId = team?.stripe_data?.subscriptionId;
    const subItemId = team?.stripe_data?.subscriptionItemId;
    const stripeCallUrl = `https://api.stripe.com/v1/subscriptions/${subId}`;
    const Authorization = `Bearer ${process.env.STRIPE_SECRET_KEY}`;
    const headers = { Authorization, 'content-type': 'application/x-www-form-urlencoded' };
    await axios.post(
      stripeCallUrl,
      {
        items: [
          {
            id: subItemId,
            quantity: newTeamMemberCount,
          },
        ],
      },
      { headers },
    );
  } catch (error) {
    captureErrorWithContext(error, {
      operation: 'updateTeamSubscriptionQuantity',
      cronJob: 'expired-team-members',
      teamId: team.id,
      extra: {
        subscriptionId: team?.stripe_data?.subscriptionId,
        newTeamMemberCount,
      },
    });
  }
}

async function revokeMemberTeamEntitlement(memberId: string) {
  try {
    const callUrl = `https://api.revenuecat.com/v1/subscribers/${memberId}/entitlements/${Entitlement.team_member}/revoke_promotionals`;
    const Authorization = `Bearer ${process.env.REVENUE_CAT_SECRET_KEY}`;
    const headers = { Authorization };
    await axios.post(callUrl, {}, { headers });
  } catch (error) {
    captureErrorWithContext(error, {
      operation: 'revokeMemberTeamEntitlement',
      cronJob: 'expired-team-members',
      userId: memberId,
      extra: {
        entitlement: Entitlement.team_member,
      },
    });
  }
}

async function disassociateMemberFromTeam({ team_id, member_id }: TeamToMember) {
  try {
    const [team, linkedMemberRecords, teamsMemberOf] = await Promise.all([
      CronJobDataSource.manager.findOne(Team, { where: { id: team_id } }),
      CronJobDataSource.manager.find(TeamToMember, { where: { team_id } }),
      CronJobDataSource.manager.find(TeamToMember, {
        where: { member_id },
      }),
    ]);
    // avoid disassociating member from team if they are team owner
    const memberIsTeamOwner = team.owner_id === member_id;
    if (memberIsTeamOwner) return;
    const isMemberOfSingleTeam = teamsMemberOf.length === 1;
    // revoke user team_member entitlement if they are removed from only team they are part of
    if (isMemberOfSingleTeam) {
      await revokeMemberTeamEntitlement(member_id);
    }
    // decrease team size in Stripe if team payment_type is 'stripe'
    if (team.payment_type === PaymentType.STRIPE) {
      await updateTeamSubscriptionQuantity(team, linkedMemberRecords);
    }
    // delete record linking member to team
    await CronJobDataSource.manager.delete(TeamToMember, { member_id, team_id });
  } catch (error) {
    captureErrorWithContext(
      error,
      {
        operation: 'disassociateMemberFromTeam',
        cronJob: 'expired-team-members',
        userId: member_id,
        teamId: team_id,
        extra: {
          memberIsTeamOwner: false,
        },
      },
      {
        shouldThrow: true, // Re-throw to prevent further processing
      },
    );
  }
}

async function runExpiredTeamMembersCronJob() {
  await CronJobDataSource.initialize();
  const expiringMembers = await getMembersWhoseTrialExpired();
  for await (const member of expiringMembers) {
    await disassociateMemberFromTeam(member);
  }
  return { membersProcessed: expiringMembers.length };
}

if (require.main === module) {
  runCronWithTelemetry('expired-team-members-cron', () => withTimeout(runExpiredTeamMembersCronJob(), CRON_JOB_TIMEOUT_MS));
}
