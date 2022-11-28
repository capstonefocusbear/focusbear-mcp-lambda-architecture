import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { CompletedActivitySequenceStats } from '../domain/completed-activity-sequence-stats.model';
import { ForceCompleteActivitySequenceQueryDto } from '../dto/force-complete-sequence-param.dto';
import { GetCompletedActivitySequenceStatsParamsDto } from '../dto/get-completed-activity-sequence-stats.dto';
import { GetCompletedActivityStatsQueryDto } from '../dto/get-completed-activity-stats.dto';
import { CompletedActivitySequenceService } from '../services/completed-activity-sequence/completed-activity-sequence.service';

@Controller('completed-activity-sequence')
@UseGuards(IsAuth)
@ApiTags('completed-activity-sequence')
@ApiSecurity('Auth0AccessToken')
export class CompletedActivitySequenceController {
  constructor(private readonly completedActivitySequenceService: CompletedActivitySequenceService) {}

  @Get(':activity_sequence_id/stats')
  getStatsByActivityPerDay(
    @Param() { activity_sequence_id }: GetCompletedActivitySequenceStatsParamsDto,
    @Query() { days_number, timezone }: GetCompletedActivityStatsQueryDto,
    @AuthContext() { user }: Passport,
  ): Promise<CompletedActivitySequenceStats> {
    return this.completedActivitySequenceService.getStatsByActivitySequencePerDay(
      { activity_sequence_id },
      { days_number, timezone },
      user.id,
    );
  }

  @Post(':activity_sequence_id/force-complete-current-sequence')
  async forceCompleteCurrentSequence(
    @Param() { activity_sequence_id }: GetCompletedActivitySequenceStatsParamsDto,
    @Query() { cancel_habits_for_today }: ForceCompleteActivitySequenceQueryDto,
    @AuthContext() { user: { id: user_id } }: Passport,
  ) {
    return this.completedActivitySequenceService.forceCompleteCurrentSequence(
      activity_sequence_id,
      user_id,
      cancel_habits_for_today,
    );
  }
}
