import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TaskAttachmentParamsDto {
  @ApiProperty({ description: 'Task ID' })
  @IsUUID()
  task_id: string;
}
