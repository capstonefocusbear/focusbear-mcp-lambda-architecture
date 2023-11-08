import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { RevenueCatService } from '@app/revenue-cat';
import { SendGridService } from '@app/send-grid';
import { JwtService } from '@app/jwt';
import { StripeService } from '@app/stripe';
import { StripeEvents } from '@app/stripe/model/stripe-events.enum';
import { User } from '../../../user/entities/user.entity';
import { UserRepository } from '../../../user/repositories/user.repository';
import { MemberInvitationPayload } from '../../domain/member-invitation-payload.mode';
import { Team } from '../../entities/team.entity';
import { TeamRepository } from '../../repositories/team.repository';
import { A_TEAM, EMAIL_TEMPLATE_IDS, FOCUS_BEAR_EMAILS } from '../../../../shared/utils/constants';
import { Auth0ManagementService } from '../../../../../../../libs/auth0/src';
import { Entitlement } from '../../../subscription/domain/entitlement.enum';

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
  ) {}

  async addTeamMember(memberId: string, adminId: string, teamId: string): Promise<User> {
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
      const [user, team] = await Promise.all([
        this.userRepository.orm.findOne({
          where: { id: memberId },
          relations: ['member_of_teams'],
        }),
        this.teamRepository.findActiveTeamWithMembers(teamId, adminId),
      ]);
      this.validateTeamMembership(user, team, { member_id: memberId, owner_id: adminId });
      // Save user as part of team
      user.member_of_teams = [...user.member_of_teams, team];
      const [member] = await Promise.all([
        this.userRepository.orm.save(user),
        this.revenueCatService.grantTeamMembership(user.id, Entitlement.team_member),
      ]);
      const newTeamSize = team.members.length + 1;
      await this.updateTeamSize(adminId, teamId, newTeamSize);
      return member;
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  private validateTeamMembership(user: User, team: Team, { member_id, owner_id }): void | never {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Validating team membership',
      data: {
        user_id: user?.id,
        team_id: team?.id,
        member_id,
        owner_id,
      },
    });
    if (!user) throw new NotFoundException(`The User with id: ${member_id} does not exist!`);
    const teamMemberIds = team.members.map((member) => member.id);
    const isUserAlreadyInTeam = teamMemberIds.includes(member_id);
    if (isUserAlreadyInTeam) {
      throw new BadRequestException(`User with ID ${member_id} is already in team with ID: ${team.id}`);
    }
  }

  async bulkDeleteTeamMembers(member_ids: string[], adminId: string, teamId: string): Promise<any> {
    try {
      const team = await this.teamRepository.findActiveTeamWithMembers(teamId, adminId);
      if (!team) throw new NotFoundException(`The Team with owner_id: ${adminId} does not exist or is inactive!`);
      const checkTargetMember = ({ id }: User) => member_ids.includes(id) && id !== adminId;
      const membersToDelete = team.members.filter(checkTargetMember);
      await Promise.all(membersToDelete.map((e) => this.disassociateMemberFromTheTeam(e, team.owner_id, teamId)));
      const newTeamSize = team.team_size - member_ids.length;
      await this.updateTeamSize(adminId, teamId, newTeamSize);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async revokeTeamMembersEntitlements(stripeSubId: string) {
    try {
      const { members } = await this.teamRepository.orm.findOne({
        where: { stripe_subscription_id: stripeSubId },
        relations: ['members', 'members.member_of_teams'],
      });
      const revokeEntitlementsPromises = [];
      for (const member of members) {
        // check if user is part of more than one team
        const teamsLinkedTo = member.member_of_teams.length;
        // user is only linked to this team, so remove team membership entitlement
        if (teamsLinkedTo === 1) {
          revokeEntitlementsPromises.push(
            this.revenueCatService.revokeTeamMembership(member.id, Entitlement.team_member),
          );
        }
      }
      await Promise.all(revokeEntitlementsPromises);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async revokeAdminMembersEntitlements(stripeSubId: string) {
    const { members } = await this.teamRepository.orm.findOne({
      where: { stripe_subscription_id: stripeSubId },
      relations: ['members', 'members.admin_of_teams'],
    });
    const revokeEntitlementsPromises = [];
    for (const member of members) {
      // check if user is part of more than one team
      const teamsAdminTo = member.admin_of_teams.length;
      // user is only linked to this team, so remove team membership entitlement
      if (teamsAdminTo === 1) {
        revokeEntitlementsPromises.push(this.revenueCatService.revokeTeamMembership(member.id, Entitlement.team_admin));
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
    const { members } = await this.teamRepository.orm.findOne({
      where: { stripe_subscription_id: stripeSubId },
      relations: ['members'],
    });
    const reassignEntitlementsPromises = [];
    for (const member of members) {
      reassignEntitlementsPromises.push(this.revenueCatService.grantTeamMembership(member.id, Entitlement.team_member));
    }
    await Promise.all([reassignEntitlementsPromises]);
  }

  private disassociateMemberFromTheTeam(member: User, ownerId: string, teamId: string) {
    if (member.id === ownerId) {
      throw new BadRequestException(`Cannot remove owner from team with ID ${teamId}!`);
    }
    const isPartOfMultipleTeams = member.member_of_teams.length > 1;
    const memberCopy = { ...member };
    memberCopy.member_of_teams = memberCopy.member_of_teams.filter((team) => team.id !== teamId);
    const savedUserPromise = this.userRepository.orm.save(memberCopy);
    // If user is only part of a single team, revoke team_member entitlement
    let revokedMembershipEntitlementPromise = null;
    if (!isPartOfMultipleTeams) {
      revokedMembershipEntitlementPromise = this.revenueCatService.revokeTeamMembership(
        member.id,
        Entitlement.team_member,
      );
    }
    return Promise.all([savedUserPromise, revokedMembershipEntitlementPromise]);
  }

  async removeMember(adminId: string, memberId: string, teamId: string): Promise<User> {
    try {
      const team = await this.teamRepository.findActiveTeamWithMembers(teamId, adminId);
      if (memberId === team.owner_id) {
        throw new BadRequestException(`Can't remove owner from team with ID: ${teamId}. Owner ID: ${team.owner_id}`);
      }
      const member = await this.userRepository.orm.findOne({ where: { id: memberId }, relations: ['member_of_teams'] });
      const [updatedMember] = await this.disassociateMemberFromTheTeam(member, team.owner_id, teamId);
      const newTeamSize = team.members.length - 1;
      await this.updateTeamSize(adminId, teamId, newTeamSize);
      return updatedMember;
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async inviteTeamMember(email: string, adminId: string, teamId: string): Promise<any> {
    try {
      const team = await this.teamRepository.findActiveTeamWithMembers(teamId, adminId);
      const payload = new MemberInvitationPayload({ admin_id: adminId, email, team_id: teamId });
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
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async acceptInvitation(token: string, user_id: string) {
    try {
      const userPromise = this.userRepository.orm.findOneBy({ id: user_id });
      const payloadPromise = this.jwtService.asyncVerify(token);
      const [user, { admin_id, email, team_id }] = await Promise.all([userPromise, payloadPromise]);
      const userAuth0Data = await this.auth0ManagementService.getAuth0User(user?.auth0_id);
      const hasInvitationEmail = userAuth0Data.email === email;
      const hasInvalidEmailMsg = `The invite can be accepted only by user with email: ${email}! Current account registered with ${userAuth0Data.email}.`;
      if (!hasInvitationEmail) throw new BadRequestException(hasInvalidEmailMsg);
      return await this.addTeamMember(user_id, admin_id, team_id);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async assignMemberAsAdmin(adminId: string, memberId: string, teamId: string) {
    const team = await this.teamRepository.findActiveTeamWithMembers(teamId, adminId);
    const member = await this.userRepository.orm.findOne({ where: { id: memberId }, relations: ['admin_of_teams'] });
    member.admin_of_teams = [...member.admin_of_teams, team];
    await Promise.all([
      this.userRepository.orm.save(member),
      this.revenueCatService.grantTeamMembership(memberId, Entitlement.team_admin),
    ]);
  }

  async removeMemberAsAdmin(adminId: string, memberId: string, teamId: string) {
    await this.teamRepository.findActiveTeamWithMembers(teamId, adminId);
    const member = await this.userRepository.orm.findOne({ where: { id: memberId }, relations: ['admin_of_teams'] });
    member.admin_of_teams = member.admin_of_teams.filter((team) => team.id !== teamId);
    await Promise.all([
      this.userRepository.orm.save(member),
      this.revenueCatService.revokeTeamMembership(memberId, Entitlement.team_admin),
    ]);
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
      admin_members: [user],
      members: [user],
      expires_date: expiresDate,
      stripe_subscription_id: subscriptionId,
    });
    await Promise.all([
      this.teamRepository.orm.save(team),
      this.revenueCatService.grantTeamMembership(user.id, Entitlement.team_admin),
      this.revenueCatService.grantTeamMembership(user.id, Entitlement.team_owner),
    ]);
  }

  async updateTeamSize(userId: string, teamId: string, teamSize: number) {
    const user = await this.userRepository.orm.findOneBy({ id: userId });
    const team = await this.teamRepository.findActiveTeamWithMembers(teamId, userId);
    if (!user) {
      throw new NotFoundException(`User with ID: ${userId} does not exist!`);
    }
    if (!team) {
      throw new NotFoundException(`Team with ID: ${teamId} does not exist!`);
    }
    const subId = team?.stripe_data?.subscriptionId;
    const subItemId = team?.stripe_data?.subscriptionItemId;
    if (!subId || !subItemId) {
      throw new Error(`Missing stripe data for team with ID: ${teamId}`);
    }
    await Promise.all([
      this.stripeService.updateSubscription(subId, subItemId, teamSize),
      this.teamRepository.update(teamId, { team_size: teamSize }),
    ]);
  }

  async getAllTeamMembers(adminId: string, teamId: string) {
    const team = await this.teamRepository.findActiveTeamWithMembers(teamId, adminId);
    const { members, admin_members } = team;
    const membersData = [];
    const adminData = [];
    for await (const member of members) {
      const { email } = await this.auth0ManagementService.getAuth0User(member.auth0_id);
      membersData.push({ id: member.id, email });
    }
    for await (const adminMember of admin_members) {
      const { email } = await this.auth0ManagementService.getAuth0User(adminMember.auth0_id);
      adminData.push({ id: adminMember.id, email });
    }
    return { members: membersData, admin: adminData };
  }

  async updateTeamName(adminId: string, teamId: string, name: string) {
    await this.teamRepository.findActiveTeamWithMembers(teamId, adminId);
    await this.teamRepository.update(teamId, { name });
  }

  async getAdminUserTeams(adminId: string) {
    const user = await this.userRepository.orm.findOne({
      where: { id: adminId },
      relations: ['admin_of_teams'],
    });
    return user.admin_of_teams.map(({ id, name, team_size, owner_id }) => {
      return { id, name, team_size, owner_id };
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
      const team = await this.teamRepository.findActiveTeamWithMembers(teamId, ownerId);
      if (team.owner_id !== ownerId) {
        throw new UnauthorizedException(
          `User with ID: ${ownerId} can't delete team with ID: ${teamId}, only the owner of a team can delete the team!`,
        );
      }
      const revokeMemberEntitlementsPromise = this.revokeTeamMembersEntitlements(teamId);
      const revokeAdminEntitlementsPromise = this.revokeAdminMembersEntitlements(teamId);
      const revokeOwnerEntitlementPromise = this.revokeOwnerEntitlement(teamId);
      const deleteTeamPromise = this.teamRepository.orm.delete({ id: teamId });
      const cancelSubscriptionPromise = this.stripeService.cancelSubscription(team.stripe_subscription_id);
      await Promise.all([
        revokeMemberEntitlementsPromise,
        revokeAdminEntitlementsPromise,
        revokeOwnerEntitlementPromise,
        deleteTeamPromise,
        cancelSubscriptionPromise,
      ]);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }
}
