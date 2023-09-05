import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ToDoStatus } from '../domain/to-do-status.enum';

export class ToDoTimeLogDto {
  @IsNotEmpty()
  @IsUUID()
  todo_id: string;

  @IsNotEmpty()
  @IsNumber()
  duration_logged_seconds: number;

  @IsNotEmpty()
  @IsEnum(ToDoStatus)
  @ApiProperty({ enum: ToDoStatus })
  completion_status: ToDoStatus;

  @IsNotEmpty()
  @IsBoolean()
  is_billable: boolean;
}
