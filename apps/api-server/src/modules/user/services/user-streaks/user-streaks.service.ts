import { Injectable } from '@nestjs/common';
import { DailyStats } from '../../entities/user-daily-stats.entity';
import { TasksStreaksResponse } from '../../domain/tasks-streaks-response.model';
import { DailySequenceDurations } from '../../../activity/domain/daily-sequence-durations.model';
import {
  calculateStreaks,
  calculateRoutineStatsIn90Days,
} from '../../../../../../../cron-jobs/user-stats-cron-job/helpers';

@Injectable()
export class UserStreaksService {
  public calculateStreaksForUser(
    userDailyStats: DailyStats[],
    timeZone: string,
    dailySequenceDurations: {
      morningRoutineDailyDurations: DailySequenceDurations;
      eveningRoutineDailyDurations: DailySequenceDurations;
      microBreaksDailyDurations: DailySequenceDurations;
    },
    userCreatedAt: Date,
  ): TasksStreaksResponse {
    return calculateStreaks(userDailyStats, timeZone, dailySequenceDurations, userCreatedAt);
  }

  public get90DayStats(userDailyStats: DailyStats[], userCreatedAt: Date, timeZone: string) {
    return calculateRoutineStatsIn90Days(userDailyStats, userCreatedAt, timeZone);
  }
}
