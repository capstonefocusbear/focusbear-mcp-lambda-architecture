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
