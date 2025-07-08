import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAsyncTaskDto {
  @ApiPropertyOptional({
    description: 'Metadata for the async task',
    example: { taskType: 'data-processing', userId: 'user-123', payload: {} },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
