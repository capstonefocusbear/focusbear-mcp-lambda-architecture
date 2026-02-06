import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TaskCommentParamsDto {
  @ApiProperty({ description: 'Task ID' })
  @IsUUID()
  task_id: string;
}
