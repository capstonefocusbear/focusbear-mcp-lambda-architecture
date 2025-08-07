import { ApiProperty } from '@nestjs/swagger';

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
