import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { TeamToMember } from '../entities/team-to-member.entity';

@Injectable()
export class TeamToMemberRepository extends BaseRepository<TeamToMember> {
  constructor(private readonly connection: Connection) {
    super(connection, TeamToMember);
  }
}
