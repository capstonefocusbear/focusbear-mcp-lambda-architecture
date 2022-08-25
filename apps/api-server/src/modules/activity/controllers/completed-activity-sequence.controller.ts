import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { CompletedActivitySequenceStats } from '../domain/completed-activity-sequence-stats.model';
import { GetCompletedActivitySequenceStatsParamsDto } from '../dto/get-completed-activity-sequence-stats.dto';
import { GetCompletedActivityStatsQueryDto } from '../dto/get-completed-activity-stats.dto';
import { StartFlexSequenceDto } from '../dto/start-flex-sequence.dto';
import { ActivitySequenceService } from '../services/activity-sequence/activity-sequence.service';
import { CompletedActivitySequenceService } from '../services/completed-activity-sequence/completed-activity-sequence.service';

@Controller('completed-activity-sequence')
@UseGuards(IsAuth)
@ApiTags('completed-activity-sequence')
@ApiSecurity('Auth0AccessToken')
export class CompletedActivitySequenceController {
  constructor(
    private readonly completedActivitySequenceService: CompletedActivitySequenceService,
    private readonly activitySequenceService: ActivitySequenceService,
  ) {}

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
    @AuthContext() { user: { id: user_id } }: Passport,
  ) {
    return this.completedActivitySequenceService.forceCompleteCurrentSequence(activity_sequence_id, user_id);
  }

  @Post(':activity_sequence_id/start-flex-sequence')
  async startFlexSequenc(
    @Param() { activity_sequence_id }: GetCompletedActivitySequenceStatsParamsDto,
    @Body() startFlexSequenceDto: StartFlexSequenceDto,
    @AuthContext() { user: { id: user_id } }: Passport,
  ) {
    return this.activitySequenceService.startFlexSequence(activity_sequence_id, user_id, startFlexSequenceDto);
  }
}
