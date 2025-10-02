import { ApiProperty } from '@nestjs/swagger';
import { RoutineMetricsDto } from './routine-metrics.dto';
import { FocusMetricsDto } from './focus-metrics.dto';
import { TaskMetricsDto } from './task-metrics.dto';
import { StreakMetricsDto } from './streak-metrics.dto';

export class MonthlyProgressMetricsDto {
  @ApiProperty({ description: 'Start date of the month' })
  month_start: Date;

  @ApiProperty({ description: 'End date of the month' })
  month_end: Date;

  @ApiProperty({ description: 'Routine completion metrics' })
  routines: RoutineMetricsDto;

  @ApiProperty({ description: 'Focus session metrics' })
  focus_sessions: FocusMetricsDto;

  @ApiProperty({ description: 'Task completion metrics' })
  tasks: TaskMetricsDto;

  @ApiProperty({ description: 'Streak metrics' })
  streaks: StreakMetricsDto;
}