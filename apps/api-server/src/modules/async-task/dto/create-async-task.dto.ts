import { IsOptional, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAsyncTaskDto {
  @ApiPropertyOptional({
    description: 'Metadata for the async task',
    example: { taskType: 'data-processing', userId: 'user-123', payload: {} },
  })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Timeout duration in seconds. If not provided, uses default timeout.',
    example: 300,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  timeoutSeconds?: number;
}
