import { ApiProperty } from '@nestjs/swagger';

export class RoutineMetricsDto {
  @ApiProperty({ description: 'Morning routine metrics' })
  morning: {
    completed: number;
    total: number;
    streak: number;
  };

  @ApiProperty({ description: 'Evening routine metrics' })
  evening: {
    completed: number;
    total: number;
    streak: number;
  };

  @ApiProperty({ description: 'Micro breaks metrics' })
  micro_breaks: {
    completed: number;
    total: number;
    streak: number;
  };
}

export class FocusMetricsDto {
  @ApiProperty({ description: 'Total focus minutes' })
  total_minutes: number;

  @ApiProperty({ description: 'Number of focus sessions' })
  sessions_count: number;

  @ApiProperty({ description: 'Longest focus session in minutes' })
  longest_session: number;

  @ApiProperty({ description: 'Current focus streak' })
  streak: number;
}

export class TaskMetricsDto {
  @ApiProperty({ description: 'Tasks completed' })
  completed: number;

  @ApiProperty({ description: 'Tasks created' })
  created: number;

  @ApiProperty({ description: 'Task completion rate' })
  completion_rate: number;
}

export class StreakMetricsDto {
  @ApiProperty({ description: 'Current overall streak' })
  current_overall: number;

  @ApiProperty({ description: 'Best overall streak' })
  best_overall: number;

  @ApiProperty({ description: 'Morning routine streak' })
  morning_routine: number;

  @ApiProperty({ description: 'Evening routine streak' })
  evening_routine: number;

  @ApiProperty({ description: 'Focus mode streak' })
  focus_mode: number;
}



export class WeeklyProgressMetricsDto {
  @ApiProperty({ description: 'Start date of the week' })
  week_start: Date;

  @ApiProperty({ description: 'End date of the week' })
  week_end: Date;

  @ApiProperty({ description: 'Routine completion metrics' })
  routines: RoutineMetricsDto;

  @ApiProperty({ description: 'Focus session metrics' })
  focus_sessions: FocusMetricsDto;

  @ApiProperty({ description: 'Task completion metrics' })
  tasks: TaskMetricsDto;

  @ApiProperty({ description: 'Streak metrics' })
  streaks: StreakMetricsDto;


}
