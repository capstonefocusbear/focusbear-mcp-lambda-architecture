import { ApiProperty } from '@nestjs/swagger';

export class TaskMetricsDto {
  @ApiProperty({ description: 'Tasks completed' })
  completed: number;

  @ApiProperty({ description: 'Tasks created' })
  created: number;

  @ApiProperty({ description: 'Task completion rate' })
  completion_rate: number;
}
