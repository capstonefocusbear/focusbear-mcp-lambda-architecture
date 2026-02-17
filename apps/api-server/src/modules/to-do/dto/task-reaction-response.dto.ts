import { ApiProperty } from '@nestjs/swagger';

export class TaskReactionResponseDto {
  @ApiProperty({ description: 'Reaction ID' })
  id: string;

  @ApiProperty({ description: 'Task ID' })
  task_id: string;

  @ApiProperty({ description: 'User ID' })
  user_id: string;

  @ApiProperty({ description: 'Emoji reaction' })
  emoji: string;

  @ApiProperty({ description: 'Creation timestamp' })
  created_at: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updated_at: Date;
}
