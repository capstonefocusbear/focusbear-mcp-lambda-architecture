import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { Team } from '../entities/team.entity';

@Injectable()
export class TeamRepository extends BaseRepository<Team> {
  constructor(private readonly connection: Connection) {
    super(connection, Team);
  }
}
