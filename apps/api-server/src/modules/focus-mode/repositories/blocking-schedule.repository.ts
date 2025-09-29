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
    const prevDay = (currentDay + 6) % 7;

    // Match both same-day ranges and overnight ranges (start_time > end_time)
    // Same-day: start_time <= now <= end_time on currentDay
    // Overnight case A (late night): start_time > end_time AND now >= start_time on currentDay
    // Overnight case B (after midnight): start_time > end_time AND now <= end_time on prevDay
    return this.orm
      .createQueryBuilder('blocking_schedule')
      .leftJoinAndSelect('blocking_schedule.focus_mode', 'focus_mode')
      .where('blocking_schedule.user_id = :userId', { userId })
      .andWhere(
        '(' +
          '(blocking_schedule.start_time <= :currentTime AND blocking_schedule.end_time >= :currentTime AND blocking_schedule.days_of_week @> :currentDayArray)' +
          ' OR ' +
          '(blocking_schedule.start_time > blocking_schedule.end_time AND :currentTime >= blocking_schedule.start_time AND blocking_schedule.days_of_week @> :currentDayArray)' +
          ' OR ' +
          '(blocking_schedule.start_time > blocking_schedule.end_time AND :currentTime <= blocking_schedule.end_time AND blocking_schedule.days_of_week @> :prevDayArray)' +
          ')',
        {
          currentTime,
          currentDayArray: [currentDay],
          prevDayArray: [prevDay],
        },
      )
      .orderBy('blocking_schedule.created_at', 'ASC')
      .getMany();
  }
}
