import { PageOrder } from '../../../shared/domain/page-order.enum';
import { PaginationOptionsDto } from '../../../shared/pagination/pagination-options.dto';

export class GetProjectsQueryDto extends PaginationOptionsDto {
  readonly take?: number = 20;

  readonly order?: PageOrder = PageOrder.DESC;
}
