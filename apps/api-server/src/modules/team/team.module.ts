import { Module } from '@nestjs/common';
import { TeamRepository } from './repositories/team.repository';

@Module({
  providers: [TeamRepository],
  exports: [TeamRepository],
})
export class TeamModule {}
