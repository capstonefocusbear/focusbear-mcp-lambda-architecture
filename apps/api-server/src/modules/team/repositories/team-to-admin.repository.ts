import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { TeamToAdmin } from '../entities/team-to-admin.entity';

@Injectable()
export class TeamToAdminRepository extends BaseRepository<TeamToAdmin> {
  constructor(private readonly connection: Connection) {
    super(connection, TeamToAdmin);
  }
}
