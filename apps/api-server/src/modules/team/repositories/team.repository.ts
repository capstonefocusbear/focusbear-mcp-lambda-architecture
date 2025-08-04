import { Injectable } from '@nestjs/common';
import { Connection, In } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { Team } from '../entities/team.entity';
import { TeamToMemberRepository } from './team-to-member.repository';
import { TeamToAdminRepository } from './team-to-admin.repository';
import { UserRepository } from '../../user/repositories/user.repository';
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

  async getTeamIncludingUnregistered(team: Team): Promise<{ members: TeamToMember[]; admins: TeamToAdmin[] }> {
    const [members, admins] = await Promise.all([
      await this.teamToMemberRepository.orm.find({ where: { team_id: team.id } }),
      await this.teamToAdminRepository.orm.find({ where: { team_id: team.id } }),
    ]);

    admins.push(new TeamToAdmin({ admin_id: team.owner_id, team_id: team.id }));

    return { members, admins };
  }

  async getTeamMembersIncludingUnregistered(teamId: string): Promise<TeamToMember[]> {
    return this.teamToMemberRepository.orm.find({ where: { team_id: teamId } });
  }

  async getTeamMembers(teamId: string) {
    const linkedMemberRecords = await this.teamToMemberRepository.orm.find({ where: { team_id: teamId } });
    const linkedMemberIds = linkedMemberRecords.map((record) => record.member_id);
    const members = await this.userRepository.orm.find({ where: { id: In(linkedMemberIds) } });
    return members;
  }
}
