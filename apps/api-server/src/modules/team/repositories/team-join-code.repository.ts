import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { TeamJoinCode } from '../entities/team-join-code.entity';

@Injectable()
export class TeamJoinCodeRepository extends BaseRepository<TeamJoinCode> {
  constructor(private readonly connection: Connection) {
    super(connection, TeamJoinCode);
  }
}
