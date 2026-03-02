import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TaskCommentReactionParamsDto {
  @ApiProperty({ description: 'Task ID' })
  @IsUUID()
  @IsNotEmpty()
  task_id: string;

  @ApiProperty({ description: 'Comment ID' })
  @IsUUID()
  @IsNotEmpty()
  comment_id: string;
}
