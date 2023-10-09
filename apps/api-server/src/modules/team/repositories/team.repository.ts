import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { Team } from '../entities/team.entity';

@Injectable()
export class TeamRepository extends BaseRepository<Team> {
  constructor(private readonly connection: Connection) {
    super(connection, Team);
  }

  async findActiveTeamWithMembers(teamId: string, adminId: string): Promise<Team> {
    const team = await this.orm.findOne({ where: { id: teamId }, relations: ['members', 'admin_members'] });
    const adminMemberIds = team.admin_members.map((admin) => admin.id);
    const isUserAdmin = adminMemberIds.includes(adminId);
    if (!isUserAdmin) {
      throw new UnauthorizedException(`User with ID: ${adminId} is not an admin member of this team!`);
    }
    return team;
  }
}
