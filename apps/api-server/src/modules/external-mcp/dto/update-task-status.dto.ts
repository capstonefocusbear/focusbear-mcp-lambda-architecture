import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ToDoStatus } from '../../to-do/domain/to-do-status.enum';

export class UpdateTaskStatusDto {
  @ApiProperty({
    description: 'New status for the task',
    enum: ToDoStatus,
    example: ToDoStatus.IN_PROGRESS,
  })
  @IsEnum(ToDoStatus)
  status: ToDoStatus;
}
