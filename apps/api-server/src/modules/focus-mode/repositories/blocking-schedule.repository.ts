import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { BlockingSchedule } from '../entities/blocking-schedule.entity';

@Injectable()
export class BlockingScheduleRepository extends BaseRepository<BlockingSchedule> {
  constructor(private readonly connection: Connection) {
    super(connection, BlockingSchedule);
  }

  async findByUserId(userId: string): Promise<BlockingSchedule[]> {
    return this.orm.find({
      where: { user_id: userId },
      relations: ['focus_mode'],
      order: { created_at: 'ASC' },
    });
  }

  async findActiveSchedulesForUser(
    userId: string,
    currentTime: string,
    currentDay: number,
  ): Promise<BlockingSchedule[]> {
    return this.orm
      .createQueryBuilder('blocking_schedule')
      .leftJoinAndSelect('blocking_schedule.focus_mode', 'focus_mode')
      .where('blocking_schedule.user_id = :userId', { userId })
      .andWhere('blocking_schedule.start_time <= :currentTime', { currentTime })
      .andWhere('blocking_schedule.end_time >= :currentTime', { currentTime })
      .andWhere('blocking_schedule.days_of_week @> :dayArray', { dayArray: [currentDay] })
      .getMany();
  }
}
