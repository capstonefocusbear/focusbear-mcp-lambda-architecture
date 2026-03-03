import { IsEnum, IsNumber, IsOptional, Min, Max, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ToDoStatus } from '../domain/to-do-status.enum';
import { ToDoSortMode } from '../domain/to-do-sort-mode.enum';
import { PaginationOptionsDto } from '../../../shared/pagination/pagination-options.dto';
import { PageOrder } from '../../../shared/domain/page-order.enum';

export class GetToDosQueryDto extends PaginationOptionsDto {
  order?: PageOrder = PageOrder.DESC;

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

  @IsOptional()
  @IsUUID()
  tag_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  perspiration_gte?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  perspiration_lte?: number;

  @IsOptional()
  @IsUUID()
  synced_project_id?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(ToDoSortMode)
  @ApiProperty({ enum: ToDoSortMode, default: ToDoSortMode.SMART, required: false })
  sort_mode?: ToDoSortMode = ToDoSortMode.SMART;

  @IsOptional()
  @Transform(({ obj, key }) => {
    const value = obj[key];
    if (typeof value === 'string') {
      return value === 'true';
    }
    return value;
  })
  @ApiProperty({ required: false, default: false, description: 'Include comments (with reactions) for each task' })
  include_comments? = false;

  @IsOptional()
  @Transform(({ obj, key }) => {
    const value = obj[key];
    if (typeof value === 'string') {
      return value === 'true';
    }
    return value;
  })
  @ApiProperty({ required: false, default: false, description: 'Include task-level reactions for each task' })
  include_reactions? = false;
}
