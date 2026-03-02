import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TaskReactionParamsDto {
  @ApiProperty({ description: 'Task ID' })
  @IsUUID()
  @IsNotEmpty()
  task_id: string;
}
