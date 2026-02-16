import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TaskAttachmentByIdParamsDto {
  @ApiProperty({ description: 'Task ID' })
  @IsUUID()
  task_id: string;

  @ApiProperty({ description: 'Attachment ID' })
  @IsUUID()
  attachment_id: string;
}
