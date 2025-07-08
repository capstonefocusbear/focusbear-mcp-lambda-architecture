import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AsyncTaskStatus } from '../domain/async-task-status.enum';

export class AsyncTaskResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the async task',
    example: 'uuid-string',
  })
  id: string;

  @ApiProperty({
    description: 'Status of the async task',
    enum: AsyncTaskStatus,
    example: AsyncTaskStatus.PENDING,
  })
  status: AsyncTaskStatus;

  @ApiPropertyOptional({
    description: 'Metadata associated with the async task',
    example: { taskType: 'data-processing', progress: 50 },
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-06-13T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-06-13T10:30:00Z',
  })
  updatedAt: Date;
}
