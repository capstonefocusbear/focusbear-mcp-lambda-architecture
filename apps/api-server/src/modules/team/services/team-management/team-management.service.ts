import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  ) {}

  async addTeamMember(member_id: string, owner_id: string): Promise<User> {
    const [user, team] = await Promise.all([
      this.userRepository.orm.findOneBy({ id: member_id }),
      this.teamRepository.findActiveTeamWithMembersByOwnerId(owner_id),
    ]);
    this.validateTeamMembershipe(user, team, { member_id, owner_id });
    user.member_of_team_id = team.id;
    const [member] = await Promise.all([
      this.userRepository.orm.save(user),
      this.revenueCatService.grantTeamMembershipe(user.id),
    ]);
    return member;
  }

  private validateTeamMembershipe(user: User, team: Team, { member_id, owner_id }): void | never {
    if (!user) throw new NotFoundException(`The User with id: ${member_id} does not exist!`);
    this.checkTeamFreeSpots(team, owner_id);
    const isUserAlreadyMemberOfThatTeam = user.member_of_team_id === team.id;
    if (isUserAlreadyMemberOfThatTeam) throw new BadRequestException('The User already participates in this Team!');
    const isUserMemberOfAnotherTeam = !!user.member_of_team_id;
    if (isUserMemberOfAnotherTeam) throw new BadRequestException('The User already participates in another Team!');
  }

  private checkTeamFreeSpots(team: Team, owner_id: string): void | never {
    if (!team) throw new NotFoundException(`The Team with owner_id: ${owner_id} does not exist or is inactive!`);
    const hasTeamSpots = team.team_size > team.members.length;
    if (!hasTeamSpots) throw new BadRequestException('The Team has no free spots to add a new member!');
  }

  async bulkDeleteTeamMembers(member_ids: string[], owner_id: string): Promise<any> {
    const team = await this.teamRepository.findActiveTeamWithMembersByOwnerId(owner_id);
    if (!team) throw new NotFoundException(`The Team with owner_id: ${owner_id} does not exist or is inactive!`);
    const checkTargetMember = ({ id }: User) => member_ids.includes(id) && id !== owner_id;
    const membersToDelete = team.members.filter(checkTargetMember);
    return Promise.all(membersToDelete.map((e) => this.disassociateMemberFromTheTeam(e)));
  }

  private disassociateMemberFromTheTeam(member: User) {
    member.nullifyTeamMembership();
    const savedUserPromise = this.userRepository.orm.save(member);
    const revokedMembershipeEntitlementPromise = this.revenueCatService.revokeTeamMembershipe(member.id);
    return Promise.all([savedUserPromise, revokedMembershipeEntitlementPromise]);
  }

  async disassociateSelf(member_id: string): Promise<User> {
    const user = await this.userRepository.orm.findOneBy({ id: member_id });
    const [updatedUser] = await this.disassociateMemberFromTheTeam(user);
    return updatedUser;
  }

  async inviteTeamMember(email: string, owner_id: string): Promise<any> {
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
      subject: 'You where invited to join team in Focus Bear app.',
    });
    return inviteUrl;
  }

  async acceptInvitation(token: string, user_id: string) {
    const userPromise = this.userRepository.orm.findOneBy({ id: user_id });
    const payloadPromise = this.jwtService.asyncVerify(token);
    const [user, { owner_id, email }] = await Promise.all([userPromise, payloadPromise]);
    const hasInvitationEmail = user.email === email;
    const hasInvalidEmailMsg = `The invite can be accepted only by user with email: ${email}! Current account registered with ${user.email}.`;
    if (!hasInvitationEmail) throw new BadRequestException(hasInvalidEmailMsg);
    return this.addTeamMember(user_id, owner_id);
  }
}
