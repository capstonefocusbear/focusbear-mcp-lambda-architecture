import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RevenueCatService } from '../../../../../../../libs/revenue-cat/src';
import { User } from '../../../user/entities/user.entity';
import { UserRepository } from '../../../user/repositories/user.repository';
import { Team } from '../../entities/team.entity';
import { TeamRepository } from '../../repositories/team.repository';

@Injectable()
export class TeamManagementService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly teamRepository: TeamRepository,
    private readonly revenueCatService: RevenueCatService,
  ) {}

  async addTeamMember(member_id: string, owner_id: string): Promise<User> {
    const [user, team] = await Promise.all([
      this.userRepository.orm.findOne(member_id),
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
    if (!team) throw new NotFoundException(`The Team with owner_id: ${owner_id} does not exist or is inactive!`);
    const hasTeamSpots = team.team_size > team.members.length;
    if (!hasTeamSpots) throw new BadRequestException('The Team has no free spots to add a new member!');
    const isUserAlreadyMemberOfThatTeam = user.member_of_team_id === team.id;
    if (isUserAlreadyMemberOfThatTeam) throw new BadRequestException('The User already participates in this Team!');
    const isUserMemberOfAnotherTeam = !!user.member_of_team_id;
    if (isUserMemberOfAnotherTeam) throw new BadRequestException('The User already participates in another Team!');
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
    const user = await this.userRepository.orm.findOne(member_id);
    const [updatedUser] = await this.disassociateMemberFromTheTeam(user);
    return updatedUser;
  }
}
