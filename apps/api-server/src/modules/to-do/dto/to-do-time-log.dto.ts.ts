import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ToDoStatus } from '../domain/to-do-status.enum';
import { ExternalSystemStatus } from '../../zoho/domain/zoho-task-status.model';

export class ToDoTimeLogDto {
  @IsNotEmpty()
  @IsUUID()
  id: string;

  @IsNotEmpty()
  @IsNumber()
  duration: number;

  @IsNotEmpty()
  @IsEnum(ToDoStatus)
  @ApiProperty({ enum: ToDoStatus })
  status: ToDoStatus;

  @IsOptional()
  external_status?: ExternalSystemStatus;

  @IsOptional()
  @IsBoolean()
  is_billable?: boolean;
}
