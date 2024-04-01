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
import { User } from '../../../user/entities/user.entity';
import { UserRepository } from '../../../user/repositories/user.repository';
import { MemberInvitationPayload } from '../../domain/member-invitation-payload.mode';
import { Team } from '../../entities/team.entity';
import { TeamRepository } from '../../repositories/team.repository';
import { A_TEAM, EMAIL_TEMPLATE_IDS, FOCUS_BEAR_EMAILS } from '../../../../shared/utils/constants';
import { Entitlement } from '../../../subscription/domain/entitlement.enum';
import { InviteTeamMemberDto } from '../../dto/invite-team-member.dto';
import { TeamToMemberRepository } from '../../repositories/team-to-member.repository';
import { TeamToAdminRepository } from '../../repositories/team-to-admin.repository';
import { TeamToMember } from '../../entities/team-to-member.entity';
import { TeamToAdmin } from '../../entities/team-to-admin.entity';
import { UpdateMemberExpiryDateDto } from '../../dto/update-member-expiry-date.dto';
import { PaymentType } from '../../domain/payment-type.enum';

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
  ) {}

  async addTeamMember(
    memberId: string,
    adminId: string,
    teamId: string,
    firstName: string,
    lastName: string,
    expiryDate: Date,
  ): Promise<User> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Adding team member',
        data: {
          memberId,
          adminId,
        },
      });
      const [user, { members, team }] = await Promise.all([
        this.userRepository.orm.findOne({
          where: { id: memberId },
        }),
        this.teamRepository.findActiveTeamWithMembers(teamId, adminId),
      ]);
      this.validateTeamMembership(user, members, {
        member_id: memberId,
        owner_id: adminId,
        teamId,
        team,
      });
      // Save user as part of team
      const connectedMemberRecord = new TeamToMember({
        member_id: memberId,
        team_id: teamId,
        first_name: firstName,
        last_name: lastName,
        member_expiry_date: expiryDate,
      });
      await this.teamToMemberRepository.orm.save(connectedMemberRecord);
      await this.revenueCatService.grantTeamMembership(user.id, Entitlement.team_member);
      await this.updateTeamSize(adminId, teamId, ++members.length);
      return user;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  private validateTeamMembership(user: User, members: User[], { member_id, owner_id, teamId, team }): void | never {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Validating team membership',
      data: {
        member_id,
        owner_id,
      },
    });
    if (!user) throw new NotFoundException(`The User with id: ${member_id} does not exist!`);
    const teamMemberIds = members.map((member) => member.id);
    const isUserAlreadyInTeam = teamMemberIds.includes(member_id);
    if (isUserAlreadyInTeam) {
      throw new BadRequestException(`User with ID ${member_id} is already in team with ID: ${teamId}`);
    }
    const { team_size, team_size_limit, payment_type } = team;
    if (payment_type === PaymentType.OFFLINE && team_size >= team_size_limit) {
      throw new BadRequestException(
        `Unable to invite more members to team with ID: ${teamId}, maximum capacity reached!`,
      );
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
        where: { stripe_subscription_id: stripeSubId },
      });
      const members = await this.teamRepository.getTeamMembers(team.id);
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

  async inviteTeamMember(
    adminId: string,
    { team_id, email, first_name, last_name, member_expiry_date, is_admin, is_member }: InviteTeamMemberDto,
  ): Promise<any> {
    try {
      const { team } = await this.teamRepository.findActiveTeamWithMembers(team_id, adminId);
      const payload = new MemberInvitationPayload({
        admin_id: adminId,
        email,
        team_id,
        first_name,
        last_name,
        member_expiry_date,
        is_admin,
        is_member,
      });
      // check whether team has available space if offline payment type
      const { team_size_limit, team_size, payment_type } = team;
      if (payment_type === PaymentType.OFFLINE && team_size >= team_size_limit) {
        throw new BadRequestException(
          `Unable to invite more members to team with ID: ${team.id}, maximum capacity reached!`,
        );
      }
      const secretKey = this.configService.get('tokens.secret');
      const token = await this.jwtService.asyncSign({ ...payload }, secretKey);
      const inviteUrl = `${this.configService.get('server.frontEndUrl')}?token=${token}`;
      await this.emailService.sendEmail({
        to: email,
        from: FOCUS_BEAR_EMAILS.MARKETING,
        templateId: EMAIL_TEMPLATE_IDS.TEAM_INVITE,
        dynamicTemplateData: { invite_url: inviteUrl, team_name: team.name ?? A_TEAM },
      });
      return inviteUrl;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async acceptInvitation(token: string, user_id: string) {
    try {
      const userPromise = this.userRepository.orm.findOneBy({ id: user_id });
      const payloadPromise: Promise<MemberInvitationPayload> = this.jwtService.asyncVerify(token);
      const [user, { admin_id, email, team_id, first_name, last_name, member_expiry_date, is_admin, is_member }] =
        await Promise.all([userPromise, payloadPromise]);
      const userAuth0Data = await this.auth0ManagementService.getAuth0User(user?.auth0_id);
      const hasInvitationEmail = true;
      const hasInvalidEmailMsg = `The invite can be accepted only by user with email: ${email}! Current account registered with ${userAuth0Data.email}.`;
      if (!hasInvitationEmail) throw new BadRequestException(hasInvalidEmailMsg);
      if (is_member) {
        await this.addTeamMember(user_id, admin_id, team_id, first_name, last_name, member_expiry_date);
      }
      if (is_admin) {
        await this.assignNewMemberAsAdmin(user_id, team_id, first_name, last_name);
      }
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
    const { team } = await this.teamRepository.findActiveTeamWithMembers(teamId, userId);
    if (!user) {
      throw new NotFoundException(`User with ID: ${userId} does not exist!`);
    }
    if (!team) {
      throw new NotFoundException(`Team with ID: ${teamId} does not exist!`);
    }
    if (team.payment_type === PaymentType.STRIPE) {
      const subId = team?.stripe_data?.subscriptionId;
      const subItemId = team?.stripe_data?.subscriptionItemId;
      if (!subId || !subItemId) {
        throw new Error(`Missing stripe data for team with ID: ${teamId}`);
      }
      await this.stripeService.updateSubscription(subId, subItemId, teamSize);
    }
    await this.teamRepository.update(teamId, { team_size: teamSize });
  }

  async getAllTeamMembers(adminId: string, teamId: string) {
    const team = await this.teamRepository.findActiveTeamWithMembers(teamId, adminId);
    const { members, admins } = team;
    const membersData = [];
    const adminData = [];
    for await (const member of members) {
      const [{ email }, { first_name, last_name, member_expiry_date, created_at }] = await Promise.all([
        this.auth0ManagementService.getAuth0User(member.auth0_id),
        this.teamToMemberRepository.orm.findOne({
          where: { team_id: teamId, member_id: member.id },
        }),
      ]);
      membersData.push({
        id: member.id,
        email,
        last_active_date: member.updated_at,
        first_name,
        last_name,
        member_expiry_date,
        created_at,
      });
    }
    for await (const adminMember of admins) {
      const [{ email }, { first_name, last_name, created_at }] = await Promise.all([
        this.auth0ManagementService.getAuth0User(adminMember.auth0_id),
        this.teamToAdminRepository.orm.findOne({
          where: { team_id: teamId, admin_id: adminMember.id },
        }),
      ]);
      adminData.push({
        id: adminMember.id,
        email,
        last_active_date: adminMember.updated_at,
        first_name,
        last_name,
        created_at,
      });
    }
    return { members: membersData, admin: adminData };
  }

  async updateTeamName(adminId: string, teamId: string, name: string) {
    await this.teamRepository.findActiveTeamWithMembers(teamId, adminId);
    await this.teamRepository.update(teamId, { name });
  }

  async getAdminUserTeams(adminId: string) {
    const teamsAdminOf = await this.teamToAdminRepository.orm.find({ where: { admin_id: adminId } });
    const teamIds = teamsAdminOf.map((team) => team.team_id);
    const teams = await this.teamRepository.orm.find({ where: { id: In(teamIds) } });
    return teams.map(({ id, name, team_size, team_size_limit, owner_id, payment_type, expires_date }) => {
      return { id, name, team_size, owner_id, payment_type, team_size_limit, expires_date };
    });
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
}
