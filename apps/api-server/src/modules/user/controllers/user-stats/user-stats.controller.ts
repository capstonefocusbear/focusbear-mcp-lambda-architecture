import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { UserDailyStatsService } from '../../services/user-daily-stats/user-daily-stats.service';
import { GetLeaderBoardQuery } from '../../dto/get-leader-board-query.dto';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';
import { AuthContext } from '../../../../shared/decorators/passport.decorator';
import { Passport } from '../../../auth/domain/passport.model';

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
    return this.userDailyStatsService.getLastWeekDailyStats(user.id);
  }
}
