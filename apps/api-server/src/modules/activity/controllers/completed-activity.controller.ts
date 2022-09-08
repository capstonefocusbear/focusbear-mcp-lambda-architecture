import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { CompletedActivityResponse } from '../domain/completed-activity-response.model';
import { CompletedActivityStats } from '../domain/completed-activity-stats.model';
import { CreateCompletedActivityDto } from '../dto/create-completed-activity.dto';
import { GetCompletedActivityLogsQueryDto } from '../dto/get-completed-activity-logs.dto';
import {
  GetCompletedActivityStatsParamsDto,
  GetCompletedActivityStatsQueryDto,
} from '../dto/get-completed-activity-stats.dto';
import { ReviseCompletedActivityDto } from '../dto/revise-completed-activity.dto';
import { CompletedActivity } from '../entities/completed-activity.entity';
import { CompletedActivityService } from '../services/completed-activity/completed-activity.service';

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

  @Get(':activity_id/stats')
  getStatsByActivityPerDay(
    @Param() { activity_id }: GetCompletedActivityStatsParamsDto,
    @Query() { days_number, timezone }: GetCompletedActivityStatsQueryDto,
  ): Promise<CompletedActivityStats> {
    return this.completedActivityService.getStatsByActivityPerDay({ activity_id }, { days_number, timezone });
  }

  @Get(':activity_id')
  getCompletedLogsByActivityInTimeRange(
    @Param() { activity_id }: GetCompletedActivityStatsParamsDto,
    @Query() { from_time, to_time }: GetCompletedActivityLogsQueryDto,
  ): Promise<CompletedActivity[]> {
    return this.completedActivityService.getCompletedLogsByActivityInTimeRange({ activity_id }, { from_time, to_time });
  }

  @Patch('revise/:completed_activity_log_id')
  reviseCompletedActivity(
    @Param() { completed_activity_id },
    @Body() { quantity_logged }: ReviseCompletedActivityDto,
  ): Promise<CompletedActivity> {
    return this.completedActivityService.reviseCompletedLog(completed_activity_id, { quantity_logged });
  }
}
