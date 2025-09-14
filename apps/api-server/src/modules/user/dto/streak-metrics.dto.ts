import { ApiProperty } from '@nestjs/swagger';

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
