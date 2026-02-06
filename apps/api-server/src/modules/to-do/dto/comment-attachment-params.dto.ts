import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CommentAttachmentParamsDto {
  @ApiProperty({ description: 'Task ID' })
  @IsUUID()
  task_id: string;

  @ApiProperty({ description: 'Comment ID' })
  @IsUUID()
  comment_id: string;
}
