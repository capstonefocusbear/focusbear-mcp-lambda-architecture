import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { JwtService } from '../../../../../../../libs/jwt/src';
import { SendGridService } from '../../../../../../../libs/send-grid/src';
import { RevenueCatService } from '../../../../../../../libs/revenue-cat/src';
import { User } from '../../../user/entities/user.entity';
import { UserRepository } from '../../../user/repositories/user.repository';
import { MemberInvitationPayload } from '../../domain/member-invitation-payload.mode';
import { Team } from '../../entities/team.entity';
import { TeamRepository } from '../../repositories/team.repository';

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
  ) {}

  async addTeamMember(member_id: string, owner_id: string): Promise<User> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Adding team member',
        data: {
          member_id,
          owner_id,
        },
      });
      const [user, team] = await Promise.all([
        this.userRepository.orm.findOneBy({ id: member_id }),
        this.teamRepository.findActiveTeamWithMembersByOwnerId(owner_id),
      ]);
      this.validateTeamMembership(user, team, { member_id, owner_id });
      user.member_of_team_id = team.id;
      const [member] = await Promise.all([
        this.userRepository.orm.save(user),
        this.revenueCatService.grantTeamMembership(user.id),
      ]);
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
    this.checkTeamFreeSpots(team, owner_id);
    const isUserAlreadyMemberOfThatTeam = user.member_of_team_id === team.id;
    if (isUserAlreadyMemberOfThatTeam) throw new BadRequestException('The User already participates in this Team!');
    const isUserMemberOfAnotherTeam = !!user.member_of_team_id;
    if (isUserMemberOfAnotherTeam) throw new BadRequestException('The User already participates in another Team!');
  }

  private checkTeamFreeSpots(team: Team, owner_id: string): void | never {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Checking team for available spots',
      data: {
        team_id: team?.id,
        owner_id,
      },
    });
    if (!team) throw new NotFoundException(`The Team with owner_id: ${owner_id} does not exist or is inactive!`);
    const hasTeamSpots = team.team_size > team.members.length;
    if (!hasTeamSpots) throw new BadRequestException('The Team has no free spots to add a new member!');
  }

  async bulkDeleteTeamMembers(member_ids: string[], owner_id: string): Promise<any> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Bulk deleting team members',
        data: {
          member_ids,
          owner_id,
        },
      });
      const team = await this.teamRepository.findActiveTeamWithMembersByOwnerId(owner_id);
      if (!team) throw new NotFoundException(`The Team with owner_id: ${owner_id} does not exist or is inactive!`);
      const checkTargetMember = ({ id }: User) => member_ids.includes(id) && id !== owner_id;
      const membersToDelete = team.members.filter(checkTargetMember);
      return await Promise.all(membersToDelete.map((e) => this.disassociateMemberFromTheTeam(e)));
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  private disassociateMemberFromTheTeam(member: User) {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Disassociate member from team',
      data: {
        member_id: member.id,
      },
    });
    member.nullifyTeamMembership();
    const savedUserPromise = this.userRepository.orm.save(member);
    const revokedMembershipEntitlementPromise = this.revenueCatService.revokeTeamMembership(member.id);
    return Promise.all([savedUserPromise, revokedMembershipEntitlementPromise]);
  }

  async disassociateSelf(member_id: string): Promise<User> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Disassociate self from team',
        data: {
          member_id,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: member_id });
      const [updatedUser] = await this.disassociateMemberFromTheTeam(user);
      return updatedUser;
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async inviteTeamMember(email: string, owner_id: string): Promise<any> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Inviting team member',
        data: {
          email,
          owner_id,
        },
      });
      const teamPromise = this.teamRepository.findActiveTeamWithMembersByOwnerId(owner_id);
      const userPromise = this.userRepository.orm.findOne({ where: { email } });
      const [team, user] = await Promise.all([teamPromise, userPromise]);
      if (user) throw new BadRequestException(`The user with email: ${email} already exists!`);
      this.checkTeamFreeSpots(team, owner_id);
      const payload = new MemberInvitationPayload({ owner_id, email });
      const token = await this.jwtService.asyncSign({ ...payload });
      const inviteUrl = `${this.configService.get('server.frontEndUrl')}?token=${token}`;
      await this.emailService.sendEmail({
        to: email,
        from: 'marketing@focusbear.io',
        text: inviteUrl,
        subject: 'You were invited to a join team in Focus Bear.',
      });
      return inviteUrl;
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async acceptInvitation(token: string, user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Accepting invitation',
        data: {
          token,
          user_id,
        },
      });
      const userPromise = this.userRepository.orm.findOneBy({ id: user_id });
      const payloadPromise = this.jwtService.asyncVerify(token);
      const [user, { owner_id, email }] = await Promise.all([userPromise, payloadPromise]);
      const hasInvitationEmail = user.email === email;
      const hasInvalidEmailMsg = `The invite can be accepted only by user with email: ${email}! Current account registered with ${user.email}.`;
      if (!hasInvitationEmail) throw new BadRequestException(hasInvalidEmailMsg);
      return await this.addTeamMember(user_id, owner_id);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }
}
