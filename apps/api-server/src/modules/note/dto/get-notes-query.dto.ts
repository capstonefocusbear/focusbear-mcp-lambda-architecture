import { IsOptional, IsUUID } from 'class-validator';
import { PageOrder } from '../../../shared/domain/page-order.enum';
import { PaginationOptionsDto } from '../../../shared/pagination/pagination-options.dto';

export class GetNotesQueryDto extends PaginationOptionsDto {
  readonly take?: number = 20;

  readonly order?: PageOrder = PageOrder.DESC;

  @IsOptional()
  @IsUUID()
  completed_activity_id?: string;

  @IsOptional()
  @IsUUID()
  tag_id?: string;
}
