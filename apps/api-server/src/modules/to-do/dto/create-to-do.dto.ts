import { IsDate, IsEnum, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ToDoStatus } from '../domain/to-do-status.enum';

export class CreateToDoDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  details: string;

  @IsOptional()
  @IsDate()
  due_date?: Date;

  @IsOptional()
  @IsUUID()
  focus_type?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(4)
  eisenhower_quadrant: number;

  @IsOptional()
  @IsEnum(ToDoStatus)
  @IsIn(Object.values(ToDoStatus))
  @ApiProperty({ enum: ToDoStatus })
  status?: ToDoStatus;
}
