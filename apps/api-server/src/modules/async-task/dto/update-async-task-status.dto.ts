import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AsyncTaskStatus } from '../domain/async-task-status.enum';

export class UpdateAsyncTaskStatusDto {
  @ApiProperty({
    description: 'Status of the async task',
    enum: AsyncTaskStatus,
    example: AsyncTaskStatus.COMPLETED,
  })
  @IsEnum(AsyncTaskStatus)
  status: AsyncTaskStatus;

  @ApiPropertyOptional({
    description: 'Updated metadata for the async task',
    example: { result: 'Task completed successfully', progress: 100 },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
