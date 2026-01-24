import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { PageOrder } from '../../../shared/domain/page-order.enum';

export class GetNotesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  take?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  skip?: number = 0;

  @IsOptional()
  @IsEnum(PageOrder)
  order?: PageOrder = PageOrder.DESC;

  @IsOptional()
  @IsUUID()
  completed_activity_id?: string;

  @IsOptional()
  @IsUUID()
  tag_id?: string;
}
