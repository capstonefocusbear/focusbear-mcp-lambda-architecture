import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TaskCommentByIdParamsDto {
  @ApiProperty({ description: 'Task ID' })
  @IsUUID()
  task_id: string;

  @ApiProperty({ description: 'Comment ID' })
  @IsUUID()
  comment_id: string;
}
