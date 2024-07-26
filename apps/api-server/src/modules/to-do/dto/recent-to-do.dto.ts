import { ArrayNotEmpty, IsArray, IsDateString, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { ToDoStatus } from '../domain/to-do-status.enum';

export class RecentToDoDto {
  @IsOptional()
  @IsDateString()
  updated_at: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ToDoStatus, { each: true })
  status?: ToDoStatus[] = [ToDoStatus.NOT_STARTED, ToDoStatus.IN_PROGRESS];

  @IsOptional()
  @IsNumber()
  take?: number = 15;
}
