import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { UserDailyStatsService } from '../../services/user-daily-stats/user-daily-stats.service';
import { GetLeaderBoardQuery } from '../../dto/get-leader-board-query.dto';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';
import { IsAdmin } from '../../../auth/guards/is-admin/is-admin.guard';
import { AuthContext } from '../../../../shared/decorators/passport.decorator';
import { Passport } from '../../../auth/domain/passport.model';
import { DAYS_IN_WEEK } from '../../../../shared/utils/constants';
import { AdminUserStatsResponseDto } from '../../dto/admin-user-stats-response.dto';
import { GetAdminUserStatsQueryDto } from '../../dto/get-admin-user-stats-query.dto';

@Controller('user-stats')
@UseGuards(IsAuth)
@ApiTags('user-stats')
@ApiSecurity('Auth0AccessToken')
export class UserStatsController {
  constructor(private readonly userDailyStatsService: UserDailyStatsService) {}

  @Get('leaderboard')
  async getStreaksLeaderBoard(@Query() { streak_type, limit }: GetLeaderBoardQuery, @AuthContext() { user }: Passport) {
    return this.userDailyStatsService.getLeaderBoardRankings(user.id, { streak_type, limit });
  }

  @Get('daily-summary')
  async getWeeklyStats(@AuthContext() { user }: Passport) {
    return this.userDailyStatsService.getLastNDaysDailyStats(user.id, DAYS_IN_WEEK);
  }

  /**
   * Fetches aggregated usage statistics for a specific user. Used by the admin support
   * dashboard to display user metrics in the "User Stats" tab.
   */
  @Get('/admin')
  @UseGuards(IsAdmin)
  async getUserStatsForAdminDashboard(
    @Query() { user_id }: GetAdminUserStatsQueryDto,
    @AuthContext() { user: admin }: Passport,
  ): Promise<AdminUserStatsResponseDto> {
    return this.userDailyStatsService.getUserStatsForAdminDashboard(admin.id, user_id);
  }
}
