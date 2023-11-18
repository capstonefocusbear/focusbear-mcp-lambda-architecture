import { DateTime } from 'luxon';
import { Between } from 'typeorm';
import axios from 'axios';
import { CronJobDataSource } from '../data-source';
import { Entitlement } from '../../apps/api-server/src/modules/subscription/domain/entitlement.enum';
import { TeamToMember } from '../../apps/api-server/src/modules/team/entities/team-to-member.entity';
import { Team } from '../../apps/api-server/src/modules/team/entities/team.entity';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

async function getMembersWhoseTrialExpiresToday() {
  const startOfCurrentDay = DateTime.local().startOf('day').toJSDate();
  const endOfCurrentDay = DateTime.local().endOf('day').toJSDate();
  // get users whose team membership expires on current date
  const expiredMembers = await CronJobDataSource.manager.find(TeamToMember, {
    where: { member_expiry_date: Between(startOfCurrentDay, endOfCurrentDay) },
  });
  return expiredMembers;
}

async function updateTeamSubscriptionQuantity(team: Team, linkedMemberRecords: TeamToMember[]) {
  try {
    const newTeamMemberCount = linkedMemberRecords.length - 1;
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
    console.error('Error updating subscription quantity fro expired-team-member cron-job: ', error?.response);
  }
}

async function revokeMemberTeamEntitlement(memberId) {
  try {
    const callUrl = `https://api.revenuecat.com/v1/subscribers/${memberId}/entitlements/${Entitlement.team_member}/revoke_promotionals`;
    const Authorization = `Bearer ${process.env.REVENUE_CAT_SECRET_KEY}`;
    const headers = { Authorization };
    await axios.post(callUrl, {}, { headers });
  } catch (error) {
    console.error('Error revoking team_member entitlement for expired team member: ', error?.response);
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
    // decrease team size in Stripe
    await updateTeamSubscriptionQuantity(team, linkedMemberRecords);
  } catch (error) {
    console.error('Error removing member from team in cron job: ', error);
  }
}

(async () => {
  try {
    await CronJobDataSource.initialize();
    const expiringMembers = await getMembersWhoseTrialExpiresToday();
    for await (const member of expiringMembers) {
      await disassociateMemberFromTeam(member);
    }
  } catch (error) {
    console.error('Error in expired-team-member cron job: ', error);
  }
})();
