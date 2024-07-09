import { IsEnum, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ToDoStatus } from '../domain/to-do-status.enum';
import { PaginationOptionsDto } from '../../../shared/pagination/pagination-options.dto';

export class GetToDosQueryDto extends PaginationOptionsDto {
  @IsOptional()
  @IsEnum(ToDoStatus)
  @ApiProperty({ enum: ToDoStatus })
  status?: ToDoStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  eisenhower_quadrant?: number;

  @IsOptional()
  @Transform(({ obj, key }) => {
    const value = obj[key];
    if (typeof value === 'string') {
      return obj[key] === 'true';
    }

    return value;
  })
  should_use_cache? = true;
}
