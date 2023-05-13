import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { CompletedActivityResponse } from '../domain/completed-activity-response.model';
import { CompletedActivityStats } from '../domain/completed-activity-stats.model';
import { DaySummary } from '../domain/day-summary.mode';
import { CreateCompletedActivityDto } from '../dto/create-completed-activity.dto';
import { CreateSkippedActivityDto } from '../dto/create-skipped-activity.dto';
import { DeleteCompletedActivityNotesDto } from '../dto/delete-completed-activity-notes.dto';
import { FetchNotesParamsDto } from '../dto/fetch-notes-params.dto';
import { GetCompletedActivityLogsQueryDto } from '../dto/get-completed-activity-logs.dto';
import {
  GetCompletedActivityStatsParamsDto,
  GetCompletedActivityStatsQueryDto,
  GetQuestionStatsParamsDto,
} from '../dto/get-completed-activity-stats.dto';
import { GetDaySummaryQueryDto } from '../dto/get-day-summary-query.dto';
import { ReviseCompletedActivityDto } from '../dto/revise-completed-activity.dto';
import { CompletedActivity } from '../entities/completed-activity.entity';
import { CompletedActivityService } from '../services/completed-activity/completed-activity.service';
import { ReviseLogQuantityAnswersBodyDto } from '../dto/revise-log-quantity-answers-body.dto';
import { GetLogQuantityAnswerLogsDto } from '../dto/get-log-quantity-answer-logs.dto';

@Controller('completed-activity')
@UseGuards(IsAuth)
@ApiTags('completed-activity')
@ApiSecurity('Auth0AccessToken')
export class CompletedActivityController {
  constructor(private readonly completedActivityService: CompletedActivityService) {}

  @Post()
  createCompletedActivity(
    @Body() completedActivity: CreateCompletedActivityDto,
    @AuthContext() { user }: Passport,
  ): Promise<CompletedActivityResponse> {
    return this.completedActivityService.completeActivity(completedActivity, { user_id: user.id });
  }

  @Post('sync')
  completedMultipleActivities(
    @Body() { completed_activites }: { completed_activites: (CreateCompletedActivityDto | CreateSkippedActivityDto)[] },
    @AuthContext() { user }: Passport,
  ): Promise<CompletedActivityResponse[]> {
    return this.completedActivityService.completeMultipleActivities(completed_activites, { user_id: user.id });
  }

  @Post('skip')
  skipActivity(@Body() skippedActivity: CreateSkippedActivityDto, @AuthContext() { user }: Passport) {
    return this.completedActivityService.skipActivity(skippedActivity, { user_id: user.id });
  }

  @Get(':activity_id/stats')
  getStatsByActivityPerDay(
    @Param() { activity_id }: GetCompletedActivityStatsParamsDto,
    @Query() { days_number, timezone }: GetCompletedActivityStatsQueryDto,
  ): Promise<CompletedActivityStats> {
    return this.completedActivityService.getStatsByActivityPerDay({ activity_id }, { days_number, timezone });
  }

  @Get('/log-question/:question_id/stats')
  getStatsByQuestionPerDay(
    @Param() { question_id }: GetQuestionStatsParamsDto,
    @Query() { days_number, timezone }: GetCompletedActivityStatsQueryDto,
  ) {
    return this.completedActivityService.getStatsByQuestionPerDay(question_id, { days_number, timezone });
  }

  @Get(':activity_id')
  getCompletedLogsByActivityInTimeRange(
    @Param() { activity_id }: GetCompletedActivityStatsParamsDto,
    @Query() { from_time, to_time }: GetCompletedActivityLogsQueryDto,
  ): Promise<CompletedActivity[]> {
    return this.completedActivityService.getCompletedLogsByActivityInTimeRange({ activity_id }, { from_time, to_time });
  }

  @Post('/answer-logs')
  async getLogQuantityAnswerLogs(
    @Body() { question_ids }: GetLogQuantityAnswerLogsDto,
    @Query() { from_time, to_time }: GetCompletedActivityLogsQueryDto,
  ) {
    return this.completedActivityService.getLogQuantityAnswersByQuestionInTimeRange(
      { question_ids },
      { from_time, to_time },
    );
  }

  @Patch('/revise/:completed_activity_id')
  reviseCompletedActivity(
    @Param() { completed_activity_id },
    @Body() { quantity_logged }: ReviseCompletedActivityDto,
  ): Promise<CompletedActivity> {
    return this.completedActivityService.reviseCompletedLog(completed_activity_id, { quantity_logged });
  }

  @Patch('/revise/log-answers')
  reviseLogQuantityAnswer(
    @Body() { log_quantity_answers }: ReviseLogQuantityAnswersBodyDto,
    @AuthContext() { user }: Passport,
  ) {
    return this.completedActivityService.reviseLogQuantityAnswers(log_quantity_answers, user.id);
  }

  @Get('/day-summary')
  getdaySummary(@AuthContext() { user }: Passport, @Query() { timezone }: GetDaySummaryQueryDto): Promise<DaySummary> {
    return this.completedActivityService.getDaySummary(user.id, timezone);
  }

  @Get('/notes')
  getCompletedActivityNotes(@Query() fetchNotesParamsDto: FetchNotesParamsDto, @AuthContext() { user }: Passport) {
    return this.completedActivityService.getCompletedActivityNotes(user.id, fetchNotesParamsDto);
  }

  @Put('/notes/delete')
  deleteCompletedActivityNotes(
    @Body() { completed_activity_ids }: DeleteCompletedActivityNotesDto,
    @AuthContext() { user }: Passport,
  ) {
    return this.completedActivityService.deleteCompletedActivityNotes(user.id, completed_activity_ids);
  }
}
