import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for admin task retrieval endpoint.
 * Contains only the fields needed for the admin dashboard to display user tasks.
 */
export class AdminTaskResponseDto {
  @ApiProperty({ description: 'Unique identifier for the task' })
  id: string;

  @ApiProperty({ description: 'Task title' })
  title: string;

  @ApiProperty({ description: 'Current status of the task' })
  status: string;

  @ApiProperty({ description: 'Due date for the task', nullable: true })
  due_date: Date | null;

  @ApiProperty({ description: 'Eisenhower matrix quadrant (1-4)', nullable: true })
  eisenhower_quadrant: number | null;

  @ApiProperty({ description: 'Duration in minutes', nullable: true })
  duration: number | null;

  @ApiProperty({ description: 'Outcome/importance level for TOP priority (1-9)', nullable: true })
  outcome: number | null;

  @ApiProperty({ description: 'Perspiration/effort level for TOP priority (1-10)', nullable: true })
  perspiration_level: number | null;

  @ApiProperty({ description: 'When the task was created' })
  created_at: string;

  @ApiProperty({ description: 'When the task was last updated' })
  updated_at: string;
}
