import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Connection, In } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { Team } from '../entities/team.entity';
import { TeamToMemberRepository } from './team-to-member.repository';
import { TeamToAdminRepository } from './team-to-admin.repository';
import { UserRepository } from '../../user/repositories/user.repository';
import { User } from '../../user/entities/user.entity';
import { TeamToMember } from '../entities/team-to-member.entity';
import { TeamToAdmin } from '../entities/team-to-admin.entity';

@Injectable()
export class TeamRepository extends BaseRepository<Team> {
  constructor(
    private readonly connection: Connection,
    private readonly teamToMemberRepository: TeamToMemberRepository,
    private readonly teamToAdminRepository: TeamToAdminRepository,
    private readonly userRepository: UserRepository,
  ) {
    super(connection, Team);
  }

  async findTeamWithMembersIncludeUnregisteredMembers(
    teamId: string,
    adminId: string,
  ): Promise<{ members: TeamToMember[]; admins: TeamToAdmin[] }> {
    const team = await this.orm.findOne({ where: { id: teamId } }); // @TODO eager:true
    if (!team) {
      throw new NotFoundException(`Team with ID: ${teamId} doesn't exists!`);
    }

    const [members, admins] = await Promise.all([
      await this.teamToMemberRepository.orm.find({ where: { team_id: teamId } }),
      await this.teamToAdminRepository.orm.find({ where: { team_id: teamId } }),
    ]);

    const isUserAdmin = admins.some((admin) => admin.admin_id === adminId);
    if (!isUserAdmin) {
      throw new UnauthorizedException(`User with ID: ${adminId} is not an admin member of this team!`);
    }
    return { members, admins };
  }

  async findActiveTeamWithMembers(
    teamId: string,
    adminId: string,
  ): Promise<{ team: Team; members: User[]; admins: User[] }> {
    const team = await this.orm.findOne({ where: { id: teamId } }); // @TODO eager:true
    if (!team) {
      throw new NotFoundException(`Team with ID: ${teamId} doesn't exists!`);
    }

    const [members, admins] = await Promise.all([this.getTeamMembers(teamId), this.getTeamAdmins(teamId)]);

    const isUserAdmin = admins.some((admin) => admin.id === adminId);
    if (!isUserAdmin) {
      throw new UnauthorizedException(`User with ID: ${adminId} is not an admin member of this team!`);
    }
    return { team, members, admins };
  }

  async getTeamMembers(teamId: string) {
    const linkedMemberRecords = await this.teamToMemberRepository.orm.find({ where: { team_id: teamId } });
    const linkedMemberIds = linkedMemberRecords.map((record) => record.member_id);
    const members = await this.userRepository.orm.find({ where: { id: In(linkedMemberIds) } });
    return members;
  }

  async getTeamAdmins(teamId: string) {
    const linkedAdminRecords = await this.teamToAdminRepository.orm.find({ where: { team_id: teamId } });
    const linkedAdminIds = linkedAdminRecords.map((record) => record.admin_id);
    const admins = await this.userRepository.orm.find({ where: { id: In(linkedAdminIds) } });
    return admins;
  }
}
