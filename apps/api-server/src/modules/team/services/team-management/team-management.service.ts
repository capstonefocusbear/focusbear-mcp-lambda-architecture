import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { RevenueCatService } from '@app/revenue-cat';
import { SendGridService } from '@app/send-grid';
import { JwtService } from '@app/jwt';
import { StripeService } from '@app/stripe';
import { StripeEvents } from '@app/stripe/model/stripe-events.enum';
import { In } from 'typeorm';
import { Auth0ManagementService } from '@app/auth0';
import { DateTime } from 'luxon';
import { User } from '../../../user/entities/user.entity';
import { UserRepository } from '../../../user/repositories/user.repository';
import { MemberInvitationPayload } from '../../domain/member-invitation-payload.mode';
import { Team } from '../../entities/team.entity';
import { TeamRepository } from '../../repositories/team.repository';
import {
  TEAM_A,
  EMAIL_TEMPLATE_IDS,
  FOCUS_BEAR_EMAILS,
  DAYS_IN_MONTH,
  DECIMAL_PRECISION,
} from '../../../../shared/utils/constants';
import { Entitlement } from '../../../subscription/domain/entitlement.enum';
import { InviteTeamMemberDto } from '../../dto/invite-team-member.dto';
import { TeamToMemberRepository } from '../../repositories/team-to-member.repository';
import { TeamToAdminRepository } from '../../repositories/team-to-admin.repository';
import { TeamToMember } from '../../entities/team-to-member.entity';
import { TeamToAdmin } from '../../entities/team-to-admin.entity';
import { UpdateMemberExpiryDateDto } from '../../dto/update-member-expiry-date.dto';
import { PaymentType } from '../../domain/payment-type.enum';
import { UserDailyStatsService } from '../../../user/services/user-daily-stats/user-daily-stats.service';
import { AddTeamManuallyDto } from '../../dto/add-team-member-manually.dto';
import { InvitationStatus } from '../../domain/invitation-status.enum';

@Injectable()
export class TeamManagementService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly teamRepository: TeamRepository,
    private readonly revenueCatService: RevenueCatService,
    private readonly jwtService: JwtService,
    private readonly emailService: SendGridService,
    private readonly configService: ConfigService,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly stripeService: StripeService,
    private readonly teamToMemberRepository: TeamToMemberRepository,
    private readonly teamToAdminRepository: TeamToAdminRepository,
    private readonly userDailyStatsService: UserDailyStatsService,
  ) {}

  async addTeamMember(
    user: User,
    adminId: string,
    teamId: string,
    firstName: string,
    lastName: string,
    email: string,
  ): Promise<User> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Adding team member',
        data: {
          user,
          adminId,
        },
      });

      const memberId = user.id;
      const { members, team } = await this.teamRepository.getTeamIncludingUnregistered(teamId, adminId);

      await this.validateMembership(memberId, teamId, team, adminId);

      await Promise.allSettled([
        this.ensureTeamMemberRecord(teamId, memberId, email, firstName, lastName, team.expires_date as Date, true),
        this.grantMembershipAndUpdateTeam(team, members.length, memberId),
      ]);

      return user;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async bulkDeleteTeamMembers(member_ids: string[], adminId: string, teamId: string): Promise<any> {
    try {
      const { team, members } = await this.teamRepository.findActiveTeamWithMembers(teamId, adminId);
      if (!team) throw new NotFoundException(`The Team with owner_id: ${adminId} does not exist or is inactive!`);
      const checkTargetMember = ({ id }: User) => member_ids.includes(id) && id !== adminId;
      const membersToDelete = members.filter(checkTargetMember);
      await Promise.all(membersToDelete.map((e) => this.disassociateMemberFromTheTeam(e, team.owner_id, teamId)));
      const newTeamSize = team.team_size - member_ids.length;
      await this.updateTeamSize(adminId, teamId, newTeamSize);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async revokeTeamMembersEntitlements(stripeSubId: string) {
    try {
      const team = await this.teamRepository.orm.findOne({
        // @TODO eager:true
        where: { stripe_subscription_id: stripeSubId },
      });
      const members = await this.teamRepository.getTeamMembers(team.id); // @TODO eager:true
      const revokeEntitlementsPromises = [];
      for await (const member of members) {
        // check if user is part of more than one team
        const teamsMemberOf = await this.teamToMemberRepository.orm.find({ where: { member_id: member.id } });
        const totalTeamsMemberOf = teamsMemberOf.length;
        // user is only linked to this team, so remove team membership entitlement
        if (totalTeamsMemberOf === 1) {
          revokeEntitlementsPromises.push(
            this.revenueCatService.revokeTeamMembership(member.id, Entitlement.team_member),
          );
        }
      }
      await Promise.all(revokeEntitlementsPromises);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async revokeAdminMembersEntitlements(stripeSubId: string) {
    const team = await this.teamRepository.orm.findOne({
      where: { stripe_subscription_id: stripeSubId },
    });
    const adminMembers = await this.teamRepository.getTeamAdmins(team.id);
    const revokeEntitlementsPromises = [];
    for await (const adminMember of adminMembers) {
      // check if user is part of more than one team
      const teamsAdminTo = await this.teamToAdminRepository.orm.find({ where: { admin_id: adminMember.id } });
      const totalTeamsAdminTo = teamsAdminTo.length;
      // user is only linked to this team, so remove team membership entitlement
      if (totalTeamsAdminTo === 1) {
        revokeEntitlementsPromises.push(
          this.revenueCatService.revokeTeamMembership(adminMember.id, Entitlement.team_admin),
        );
      }
    }
    await Promise.all(revokeEntitlementsPromises);
  }

  async revokeOwnerEntitlement(stripeSubId: string) {
    const { owner } = await this.teamRepository.orm.findOne({
      where: { stripe_subscription_id: stripeSubId },
      relations: ['owner', 'owner.owned_teams'],
    });

    const ownedTeams = owner.owned_teams.length;
    if (ownedTeams === 1) {
      await this.revenueCatService.revokeTeamMembership(owner.id, Entitlement.team_owner);
    }
  }

  async reassignTeamMembersEntitlements(stripeSubId: string) {
    const team = await this.teamRepository.orm.findOne({
      where: { stripe_subscription_id: stripeSubId },
    });
    const members = await this.teamRepository.getTeamMembers(team.id);
    const reassignEntitlementsPromises = [];
    for (const member of members) {
      reassignEntitlementsPromises.push(this.revenueCatService.grantTeamMembership(member.id, Entitlement.team_member));
    }
    await Promise.all([reassignEntitlementsPromises]);
  }

  private async disassociateMemberFromTheTeam(member: User, ownerId: string, teamId: string) {
    if (member.id === ownerId) {
      throw new BadRequestException(`Cannot remove owner from team with ID ${teamId}!`);
    }
    const memberOfTeams = await this.teamToMemberRepository.orm.find({ where: { member_id: member.id } });
    const isPartOfMultipleTeams = memberOfTeams.length > 1;
    await this.teamToMemberRepository.orm.delete({ team_id: teamId, member_id: member.id });
    // If user is only part of a single team, revoke team_member entitlement
    if (!isPartOfMultipleTeams) {
      await this.revenueCatService.revokeTeamMembership(member.id, Entitlement.team_member);
    }
  }

  async removeMember(adminId: string, memberId: string, teamId: string) {
    try {
      const { team, members } = await this.teamRepository.findActiveTeamWithMembers(teamId, adminId);
      if (memberId === team.owner_id) {
        throw new BadRequestException(`Can't remove owner from team with ID: ${teamId}. Owner ID: ${team.owner_id}`);
      }
      const member = await this.userRepository.orm.findOne({ where: { id: memberId } });
      await this.disassociateMemberFromTheTeam(member, team.owner_id, teamId);
      const newTeamSize = members.length - 1;
      await this.updateTeamSize(adminId, teamId, newTeamSize);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async assignNewMemberAsAdmin(memberId: string, teamId: string, firstName: string, lastName: string) {
    // check if user is already admin of team
    const teamAdmins = await this.teamRepository.getTeamAdmins(teamId);
    const adminUsersIds = teamAdmins.map((admin) => admin.id);
    const isAlreadyAdminOfTeam = adminUsersIds.includes(memberId);
    if (isAlreadyAdminOfTeam) {
      throw new BadRequestException(`User with ID: ${memberId} is already an admin member of team with ID: ${teamId}!`);
    }
    const connectedAdminRecord = new TeamToAdmin({
      team_id: teamId,
      admin_id: memberId,
      first_name: firstName,
      last_name: lastName,
    });
    await Promise.all([
      this.teamToAdminRepository.orm.save(connectedAdminRecord),
      this.revenueCatService.grantTeamMembership(memberId, Entitlement.team_admin),
    ]);
  }

  async assignExistingMemberAsAdmin(adminId: string, memberId: string, teamId: string) {
    const { admins } = await this.teamRepository.findActiveTeamWithMembers(teamId, adminId);
    const user = await this.userRepository.orm.findOne({ where: { id: memberId } });
    if (!user) {
      throw new BadRequestException(`User with ID: ${memberId} does not exist!`);
    }
    // check if user is already admin of team
    const adminUserIds = admins.map((admin) => admin.id);
    const isAlreadyAdminOfTeam = adminUserIds.includes(memberId);
    if (isAlreadyAdminOfTeam) {
      throw new BadRequestException(`User with ID: ${memberId} is already an admin member of team with ID: ${teamId}!`);
    }
    const connectedAdminRecord = new TeamToAdmin({
      team_id: teamId,
      admin_id: memberId,
    });
    await Promise.all([
      this.teamToAdminRepository.orm.save(connectedAdminRecord),
      this.revenueCatService.grantTeamMembership(memberId, Entitlement.team_admin),
    ]);
  }

  async removeMemberAsAdmin(adminId: string, memberId: string, teamId: string) {
    const { team } = await this.teamRepository.findActiveTeamWithMembers(teamId, adminId);
    if (memberId === team.owner_id) {
      throw new BadRequestException(`Can't remove owner from team with ID: ${teamId}. Owner ID: ${team.owner_id}`);
    }
    const teamsAdminOf = await this.teamToAdminRepository.orm.find({ where: { admin_id: memberId } });
    const isAdminOfMultipleTeams = teamsAdminOf.length > 1;
    if (isAdminOfMultipleTeams) {
      await this.revenueCatService.revokeTeamMembership(memberId, Entitlement.team_admin);
    }
    await this.teamToAdminRepository.orm.delete({ team_id: teamId, admin_id: memberId });
  }

  async registerTeam(payload: any) {
    const teamSize = payload.quantity;
    const subscriptionId = payload.id;
    const customerId = payload.customer;
    const subscriptionItemId = payload.items.data[0].id;
    const expiresDate = new Date(payload.current_period_end * 1000);
    const teamName = payload?.metadata?.team_name;
    const user = await this.userRepository.orm.findOneBy({ stripe_customer_id: customerId });
    if (!user) {
      throw new NotFoundException(`User with Stripe ID: ${customerId} does not exist!`);
    }
    const stripeData = { subscriptionId, customerId, subscriptionItemId };
    const team = new Team({
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      owner_id: user.id,
      stripe_data: stripeData,
      team_size: teamSize,
      name: teamName,
      owner: user,
      expires_date: expiresDate,
      stripe_subscription_id: subscriptionId,
      payment_type: PaymentType.STRIPE,
    });
    const [savedTeam] = await Promise.all([
      this.teamRepository.orm.save(team),
      this.revenueCatService.grantTeamMembership(user.id, Entitlement.team_admin),
      this.revenueCatService.grantTeamMembership(user.id, Entitlement.team_owner),
    ]);
    // Associate purchasing user to team as both member and admin
    const connectedMemberRecord = new TeamToMember({
      member_id: user.id,
      team_id: savedTeam.id,
    });
    const connectedAdminRecord = new TeamToAdmin({
      team_id: savedTeam.id,
      admin_id: user.id,
    });
    await Promise.all([
      this.teamToMemberRepository.orm.save(connectedMemberRecord),
      this.teamToAdminRepository.orm.save(connectedAdminRecord),
    ]);
  }

  async updateTeamSize(userId: string, teamId: string, teamSize: number) {
    const user = await this.userRepository.orm.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`User with ID: ${userId} does not exist!`);
    }

    const { team } = await this.teamRepository.findActiveTeamWithMembers(teamId, userId);
    if (!team) {
      throw new NotFoundException(`Team with ID: ${teamId} does not exist!`);
    }

    return this.syncTeamSizeWithSubscription(team, teamSize);
  }

  async getAllTeamMembers(adminId: string, teamId: string) {
    const { members, admins } = await this.teamRepository.getTeamIncludingUnregistered(teamId, adminId);
    const membersData = [];

    // Get all registered member IDs
    const memberIds = members.map((member) => member.member_id).filter(Boolean);

    // Batch queries for members
    const [userDetails, allMembersDailyStats] = await Promise.all([
      this.userRepository.orm.find({
        where: { id: In(memberIds) },
      }),
      Promise.all(memberIds.map((id) => this.userDailyStatsService.getLastNDaysDailyStats(id, DAYS_IN_MONTH * 3))),
    ]);

    // @Description:  Admins are already members; skip processing
    // Process member data
    members.forEach((member, index) => {
      const userDetail = userDetails.find((u) => u.id === member.member_id);
      const last90DaysDailyStats = allMembersDailyStats?.[index];

      const totalFocusModes = last90DaysDailyStats?.reduce((acc, curr) => acc + curr.focus_modes, 0) || 0;
      const focus_modes_percent_number_day_of_stats_completed = totalFocusModes
        ? parseFloat(((totalFocusModes / last90DaysDailyStats.length) * 100).toFixed(DECIMAL_PRECISION))
        : 0;

      membersData.push({
        id: member.member_id,
        email: member.email,
        last_active_date: member?.updated_at,
        first_name: member?.first_name,
        last_name: member?.last_name,
        member_expiry_date: member?.member_expiry_date,
        created_at: member?.created_at,
        morning_routines_streak: userDetail?.morning_routines_streak || 0,
        evening_routines_streak: userDetail?.evening_routines_streak || 0,
        focus_modes_streak: userDetail?.focus_modes_streak || 0,
        morning_percent_number_day_of_stats_completed: userDetail?.morning_percent_number_day_of_stats_completed || 0,
        micro_percent_number_day_of_stats_completed: userDetail?.micro_percent_number_day_of_stats_completed || 0,
        evening_percent_number_day_of_stats_completed: userDetail?.evening_percent_number_day_of_stats_completed || 0,
        focus_modes_percent_number_day_of_stats_completed,
        invitation_status: member.invitation_status,
        invitation_sent_at: member.invitation_sent_at,
        invitation_send_count: member.invitation_send_count,
        invitation_responded_at: member.invitation_responded_at,
      });
    });

    return { members: membersData, admins: admins.map((admin) => admin.admin_id) };
  }

  async updateTeamName(adminId: string, teamId: string, name: string) {
    await this.teamRepository.findActiveTeamWithMembers(teamId, adminId);
    await this.teamRepository.update(teamId, { name });
  }

  async getAdminUserTeams(adminId: string) {
    const teamsAdminOf = await this.teamToAdminRepository.orm.find({
      where: { admin_id: adminId },
      select: ['team_id'],
    });

    if (!teamsAdminOf.length) return [];

    const teamIds = teamsAdminOf.map((team) => team.team_id);
    const teams = await this.teamRepository.orm.find({
      where: { id: In(teamIds) },
      select: ['id', 'name', 'team_size', 'team_size_limit', 'owner_id', 'payment_type', 'expires_date', 'stripe_data'],
    });

    const subscriptionsResults = await Promise.allSettled(
      teams.map(async (team) => {
        if (team.stripe_data?.subscriptionId && team.payment_type === 'stripe') {
          return this.stripeService.subscriptions.retrieve(team.stripe_data.subscriptionId);
        }
        return null;
      }),
    );

    const teamsWithSubscription = teams.map((team, index) => {
      const stripeResult = subscriptionsResults[index];

      let stripeSubscriptionInfo: {
        start_date?: string;
        ended_at?: string;
        canceled_at?: string;
        status?: string;
        product_id?: string;
        product_name?: string;
      };

      if (stripeResult.status === 'fulfilled' && stripeResult.value) {
        const stripeData = stripeResult.value;
        const firstPlanItem = stripeData.items?.data?.[0];
        stripeSubscriptionInfo = {
          start_date: stripeData.start_date ? DateTime.fromSeconds(stripeData.start_date).toISO() : undefined,
          ended_at: stripeData.ended_at ? DateTime.fromSeconds(stripeData.ended_at).toISO() : undefined,
          canceled_at: stripeData.canceled_at ? DateTime.fromSeconds(stripeData.canceled_at).toISO() : undefined,
          status: stripeData.status ?? undefined,
          product_id: (firstPlanItem?.plan?.product as string) ?? undefined,
          product_name: (firstPlanItem?.plan?.nickname as string) ?? '',
        };
      }
      const { stripe_data, stripe_subscription_id, ...rest } = team;
      return { ...rest, ...stripeSubscriptionInfo };
    });

    return teamsWithSubscription;
  }

  async handleChangeInTeamSubscription(eventType: string, payload: any) {
    const subscriptionId = payload.id;
    const { metadata } = payload;
    if (eventType === StripeEvents.CREATED && !metadata?.team_id) {
      await this.registerTeam(payload);
    } else if (eventType === StripeEvents.CREATED && metadata?.team_id) {
      await this.handleTeamResubscription(metadata?.team_id, payload);
    } else if (eventType === StripeEvents.RESUMED) {
      await this.reassignTeamMembersEntitlements(subscriptionId);
    } else if (eventType === StripeEvents.PAUSED) {
      await this.revokeTeamMembersEntitlements(subscriptionId);
    } else if (eventType === StripeEvents.DELETED) {
      await this.handleTeamSubscriptionCancelled(subscriptionId);
    }
  }

  async handleTeamResubscription(teamId: string, payload: any) {
    const team = await this.teamRepository.orm.findOne({ where: { id: teamId } });
    const subscriptionId = payload.id;
    const customerId = payload.customer;
    const subscriptionItemId = payload.items.data[0].id;
    const stripeData = { subscriptionId, customerId, subscriptionItemId };
    const updatedTeam = new Team({
      ...team,
      is_active: true,
      stripe_subscription_id: payload.id,
      stripe_data: stripeData,
    });
    await this.teamRepository.orm.save(updatedTeam);
    await this.reassignTeamMembersEntitlements(subscriptionId);
  }

  async handleTeamSubscriptionCancelled(subscriptionId: string) {
    const team = await this.teamRepository.orm.findOne({ where: { stripe_subscription_id: subscriptionId } });
    const updatedTeam = new Team({ ...team, stripe_subscription_id: null, stripe_data: null, is_active: false });
    await Promise.all([
      this.teamRepository.orm.save(updatedTeam),
      this.revokeTeamMembersEntitlements(team.stripe_subscription_id),
    ]);
  }

  async deleteTeam(ownerId: string, teamId: string) {
    try {
      const { team } = await this.teamRepository.findActiveTeamWithMembers(teamId, ownerId);
      if (team.owner_id !== ownerId) {
        throw new UnauthorizedException(
          `User with ID: ${ownerId} can't delete team with ID: ${teamId}, only the owner of a team can delete the team!`,
        );
      }
      const revokeMemberEntitlementsPromise = this.revokeTeamMembersEntitlements(teamId);
      const revokeAdminEntitlementsPromise = this.revokeAdminMembersEntitlements(teamId);
      const revokeOwnerEntitlementPromise = this.revokeOwnerEntitlement(teamId);
      const cancelSubscriptionPromise = this.stripeService.cancelSubscription(team.stripe_subscription_id);
      await Promise.all([
        revokeMemberEntitlementsPromise,
        revokeAdminEntitlementsPromise,
        revokeOwnerEntitlementPromise,
        cancelSubscriptionPromise,
      ]);
      // delete team after other promises returned because team record needs to be queried for their logic
      await this.teamRepository.orm.delete({ id: teamId });
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async updateMemberExpiryDate(adminId: string, { team_id, member_id, expiry_date }: UpdateMemberExpiryDateDto) {
    await this.teamRepository.findActiveTeamWithMembers(team_id, adminId);
    const linkedMemberRecord = await this.teamToMemberRepository.orm.findOne({
      where: { team_id, member_id },
    });
    if (!linkedMemberRecord) {
      throw new BadRequestException(`User with ID: ${member_id} is not a member of team with ID: ${team_id}!`);
    }
    linkedMemberRecord.member_expiry_date = expiry_date;
    await this.teamToMemberRepository.orm.save(linkedMemberRecord);
  }

  async getUserDetailsFromAuth0(user_id: string) {
    const user = await this.userRepository.orm.findOne({ where: { id: user_id } });
    if (!user) {
      throw new NotFoundException(`User with id: ${user_id} does not exist!`);
    }
    const auth0User = await this.auth0ManagementService.getAuth0User(user.auth0_id);
    if (!auth0User) {
      throw new NotFoundException(`User with id: ${user_id} and auth0_id: ${user.auth0_id} does not exists in auth0!`);
    }
    const { email, given_name, family_name } = auth0User;
    return { email, given_name, family_name };
  }

  async addTeamMemberManually(adminId: string, { team_id, user_id }: AddTeamManuallyDto) {
    try {
      const team = await this.teamRepository.orm.findOneBy({ id: team_id });
      if (!team) {
        throw new NotFoundException(`The team with id: ${team_id} doesn't exists!`);
      }

      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) {
        throw new NotFoundException(`The user with id: ${user_id} doesn't exists!`);
      }

      const auth0User = await this.auth0ManagementService.getAuth0User(user.auth0_id);
      if (!auth0User) {
        throw new NotFoundException(
          `The user with id: ${user.id} and auth0_id: ${user.auth0_id} does not exists in auth0!`,
        );
      }

      const first_name = auth0User.given_name;
      const last_name = auth0User.family_name;

      return await this.addTeamMember(user, adminId, team_id, first_name, last_name, auth0User.email);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async syncTeamSizeWithSubscription(team: Team, teamSize: number) {
    if (team.payment_type === PaymentType.STRIPE) {
      const subId = team?.stripe_data?.subscriptionId;
      const subItemId = team?.stripe_data?.subscriptionItemId;
      if (!subId || !subItemId) {
        throw new Error(`Missing stripe data for team with ID: ${team.id}`);
      }
      await this.stripeService.updateSubscription(subId, subItemId, teamSize);
    }
    await this.teamRepository.update(team.id, { team_size: teamSize });
  }

  async getTeamById(team_id: string) {
    return this.teamRepository.orm.findOne({ where: { id: team_id } });
  }

  async acceptInvitation(token: string, user_id: string) {
    try {
      const tokenPayload: MemberInvitationPayload = await this.jwtService.asyncVerify(token);
      const { admin_id, email, team_id, is_admin } = tokenPayload;

      const [team, user] = await Promise.all([
        this.teamRepository.orm.findOneBy({ id: team_id }),
        this.userRepository.orm.findOneBy({ id: user_id }),
      ]);
      if (!team) {
        throw new NotFoundException(`The team with id: ${team_id} doesn't exists!`);
      }
      if (!user) throw new NotFoundException(`The User with id: ${user_id} does not exist!`);

      const auth0User = await this.auth0ManagementService.getAuth0User(user?.auth0_id);
      if (!auth0User) {
        throw new NotFoundException(
          `The User with id: ${user.id} and auth0_id: ${user.auth0_id} does not exists in auth0!`,
        );
      }

      const hasInvalidEmailMsg = `The invite can be accepted only by user with email: ${email}! Current account registered with ${auth0User.email}.`;
      if (!auth0User.email) throw new BadRequestException(hasInvalidEmailMsg);

      const isAdminAuthorizedUrl = await this.teamToAdminRepository.orm.find({ where: { team_id, admin_id } });
      if (!isAdminAuthorizedUrl) {
        throw new BadRequestException('The invitation URL is invalid or has been altered.');
      }
      const teamToMember = await this.findMemberByEmail(team_id, email);
      if (!teamToMember) {
        throw new NotFoundException('Invitation not found for this team and email.');
      }

      // @TODO Invitation expiry logic

      if (InvitationStatus.PENDING !== teamToMember.invitation_status) {
        throw new BadRequestException('This invitation is no longer valid.');
      }

      const members = await this.validateMembership(user_id, team_id, team, admin_id);

      const member = await this.teamToMemberRepository.orm.save({
        ...teamToMember,
        invitation_status: InvitationStatus.ACCEPTED,
        invitation_responded_at: new Date(),
        member_id: user_id,
      });

      if (member.invitation_status === InvitationStatus.ACCEPTED) {
        let promises = [this.grantMembershipAndUpdateTeam(team, members.length, user_id)];
        if (is_admin) {
          promises = [...promises, this.assignMemberAsAdmin(user_id, team_id)];
        }
        await Promise.allSettled(promises);
      }
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async inviteTeamMember(adminId: string, inviteTeamMemberDto: InviteTeamMemberDto, origin?: string): Promise<string> {
    try {
      const { team_id, member_expiry_date } = inviteTeamMemberDto;
      const team = await this.teamRepository.orm.findOneBy({ id: team_id });
      if (!team) {
        throw new NotFoundException(`The team with id: ${team_id} doesn't exists!`);
      }
      const { memberEmail, memberFirstName, memberLastName, userId } = await this.resolveMemberDetails(
        inviteTeamMemberDto,
      );

      const member = await this.ensureTeamMemberRecord(
        team_id,
        userId,
        memberEmail,
        memberFirstName,
        memberLastName,
        member_expiry_date,
      );

      const inviteUrl = await this.generateInviteUrl(inviteTeamMemberDto, team.name, member, adminId, origin);

      let invitationStatus = InvitationStatus.PENDING;
      try {
        await this.sendInvitationEmail(memberEmail, inviteUrl, team.name, adminId);
      } catch (error) {
        invitationStatus = InvitationStatus.FAILED;
        this.sentryService.instance().captureException(error, { level: 'error' });
      }

      await this.updateInvitationTracking(member, invitationStatus);

      return inviteUrl;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  private async resolveMemberDetails(
    dto: InviteTeamMemberDto,
  ): Promise<{ memberEmail: string; memberFirstName: string; memberLastName: string; userId: string | undefined }> {
    let memberEmail = dto.email;
    let memberFirstName = dto.first_name;
    let memberLastName = dto.last_name;
    const userId = dto.user_id;

    if (!memberEmail && !userId) {
      throw new BadRequestException(
        'Both email and user_id cannot be empty. Please provide either an email or a user_id.',
      );
    }

    if (userId) {
      const { email: authOEmail, given_name, family_name } = await this.getUserDetailsFromAuth0(userId);
      memberFirstName = given_name;
      memberLastName = family_name;
      memberEmail = authOEmail;
    }

    return { memberEmail, memberFirstName, memberLastName, userId };
  }

  private async ensureTeamMemberRecord(
    team_id: string,
    member_id: string | undefined,
    email: string,
    first_name: string,
    last_name: string,
    member_expiry_date?: Date,
    isManuallyAdded?: boolean,
  ): Promise<TeamToMember> {
    let teamToMember: TeamToMember;
    if (member_id) {
      teamToMember = await this.teamToMemberRepository.orm.findOne({
        where: { team_id, member_id },
      });
    } else if (email) {
      teamToMember = await this.findMemberByEmail(team_id, email);
    }
    if (teamToMember) {
      return teamToMember;
    }
    const member = {
      team_id,
      member_id: member_id || null,
      first_name,
      last_name,
      member_expiry_date,
      email,
    };
    const memberInfo = isManuallyAdded
      ? {
          ...member,
          invitation_status: InvitationStatus.ACCEPTED,
          invitation_responded_at: new Date(),
          invitation_sent_at: new Date(),
          invitation_send_count: 1,
        }
      : member;
    teamToMember = this.teamToMemberRepository.orm.create(memberInfo);
    await this.teamToMemberRepository.orm.save(teamToMember);

    return teamToMember;
  }

  private async updateInvitationTracking(
    teamToMember: TeamToMember,
    invitationStatus: InvitationStatus,
  ): Promise<void> {
    const member = teamToMember;
    member.invitation_send_count = (teamToMember.invitation_send_count || 0) + 1;
    member.invitation_status = invitationStatus;
    await this.teamToMemberRepository.orm.save(member);
  }

  private async generateInviteUrl(
    dto: InviteTeamMemberDto,
    team_name: string,
    member: TeamToMember,
    adminId: string,
    origin?: string,
  ): Promise<string> {
    const payload = new MemberInvitationPayload({
      admin_id: adminId,
      email: member.email,
      team_id: dto.team_id,
      first_name: member.first_name,
      last_name: member.last_name,
      member_expiry_date: dto.member_expiry_date,
      is_admin: dto.is_admin,
      team_name: team_name ?? TEAM_A,
      needs_registration: !member.member_id,
    });
    const secretKey = this.configService.get('tokens.secret');
    const token = await this.jwtService.asyncSign({ ...payload }, secretKey);

    const devFrontendUrl = this.configService.get('devFrontendUrl');
    return `${
      devFrontendUrl === origin ? devFrontendUrl : this.configService.get('frontEndUrl')
    }/accept-invite?token=${token}`;
  }

  private async sendInvitationEmail(
    memberEmail: string,
    inviteUrl: string,
    teamName: string,
    adminId: string,
  ): Promise<void> {
    let bcc = FOCUS_BEAR_EMAILS.SUPPORT;

    const userTeamOwner = await this.userRepository.orm.findOneBy({ id: adminId });
    if (userTeamOwner) {
      const auth0TeamOwner = await this.auth0ManagementService.getAuth0User(userTeamOwner.auth0_id);
      bcc = auth0TeamOwner?.email || FOCUS_BEAR_EMAILS.SUPPORT;
    }

    await this.emailService.sendEmail({
      to: memberEmail,
      from: FOCUS_BEAR_EMAILS.MARKETING,
      templateId: EMAIL_TEMPLATE_IDS.TEAM_INVITE,
      dynamicTemplateData: { invite_url: inviteUrl, team_name: teamName },
      bcc,
    });
  }

  private async grantMembershipAndUpdateTeam(team: Team, teamSize: number, memberId: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'service',
        level: 'debug',
        message: 'Granting team membership',
        data: { team, teamSize, memberId },
      });
      await Promise.allSettled([
        this.revenueCatService.grantTeamMembership(memberId, Entitlement.team_member),
        this.syncTeamSizeWithSubscription(team, teamSize + 1),
      ]);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  private async assignMemberAsAdmin(member_id: string, teamId: string) {
    const teamAdmins = await this.teamToAdminRepository.orm.find({ where: { team_id: teamId } });
    const isAlreadyAdminOfTeam = teamAdmins.some((admin) => admin.admin_id === member_id);

    if (isAlreadyAdminOfTeam) {
      throw new BadRequestException(
        `User with ID: ${member_id} is already an admin member of team with ID: ${teamId}!`,
      );
    }
    const connectedAdminRecord = new TeamToAdmin({
      team_id: teamId,
      admin_id: member_id,
    });
    await this.teamToAdminRepository.orm.save(connectedAdminRecord);
  }

  private async validateMembership(member_id: string, teamId: string, team: Team, adminId?: string) {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Validating membership',
      data: {
        member_id,
        teamId,
        adminId,
      },
    });

    const members = await this.teamToMemberRepository.orm.find({ where: { team_id: teamId } });

    const { team_size, team_size_limit, payment_type } = team;
    if (payment_type === PaymentType.OFFLINE && team_size >= team_size_limit) {
      throw new BadRequestException(
        `Unable to invite more members to team with ID: ${teamId}, maximum capacity reached!`,
      );
    }

    const foundMember = members.some((member) => member.member_id === member_id);
    if (foundMember) {
      throw new BadRequestException(`User with ID ${member_id} is already in team with ID: ${teamId}`);
    }

    return members;
  }

  private async findMemberByEmail(team_id: string, email: string): Promise<TeamToMember | undefined> {
    const members = await this.teamToMemberRepository.orm.find({ where: { team_id } });
    return members.find((member) => member.email === email); // @Description: Direct WHERE clause filtering doesn't work due to email encryption
  }
}
