import { IsEnum, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ToDoStatus } from '../domain/to-do-status.enum';

export class GetToDosQueryDto {
  @IsOptional()
  @IsEnum(ToDoStatus)
  @ApiProperty({ enum: ToDoStatus })
  status?: ToDoStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page_num?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  eisenhower_quadrant?: number;
}
