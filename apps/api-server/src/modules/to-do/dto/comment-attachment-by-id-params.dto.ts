import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CommentAttachmentByIdParamsDto {
  @ApiProperty({ description: 'Task ID' })
  @IsUUID()
  task_id: string;

  @ApiProperty({ description: 'Comment ID' })
  @IsUUID()
  comment_id: string;

  @ApiProperty({ description: 'Attachment ID' })
  @IsUUID()
  attachment_id: string;
}
