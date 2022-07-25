import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { CompletedActivityStats } from '../domain/completed-activity-stats.model';
import { CreateCompletedActivityDto } from '../dto/create-completed-activity.dto';
import {
  GetCompletedActivityStatsParamsDto,
  GetCompletedActivityStatsQueryDto,
} from '../dto/get-completed-activity-stats.dto';
import { CompletedActivityService } from '../services/completed-activity/completed-activity.service';

@Controller('completed-activity')
@UseGuards(IsAuth)
@ApiTags('completed-activity')
@ApiSecurity('Auth0AccessToken')
export class CompletedActivityController {
  constructor(private readonly completedActivityService: CompletedActivityService) {}

  @Post()
  createCompletedActivity(@Body() completedActivity: CreateCompletedActivityDto, @AuthContext() { user }: Passport) {
    return this.completedActivityService.completeActivity(completedActivity, { user_id: user.id });
  }

  @Get(':activity_id/stats')
  getStatsByActivityPerDay(
    @Param() { activity_id }: GetCompletedActivityStatsParamsDto,
    @Query() { days_number, timezone }: GetCompletedActivityStatsQueryDto,
  ): Promise<CompletedActivityStats> {
    return this.completedActivityService.getStatsByActivityPerDay({ activity_id }, { days_number, timezone });
  }
}
