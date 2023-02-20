import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { DailyStats } from '../entities/user-daily-stats.entity';

@Injectable()
export class DailyStatsRepository extends BaseRepository<DailyStats> {
  constructor(private readonly connection: Connection) {
    super(connection, DailyStats);
  }

  async getUserDailyStats(user_id: string) {
    return this.orm.find({
      where: {
        user_id,
      },
      order: { date_completed: 'DESC' },
    });
  }
}
