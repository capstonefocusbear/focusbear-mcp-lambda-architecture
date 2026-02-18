import { ApiPropertyOptional } from '@nestjs/swagger';
import { PageOrder } from '../../../shared/domain/page-order.enum';
import { PaginationOptionsDto } from '../../../shared/pagination/pagination-options.dto';

export class GetProjectsQueryDto extends PaginationOptionsDto {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: 50,
    default: 20,
    description: 'Number of projects per page',
  })
  readonly take?: number = 20;

  @ApiPropertyOptional({
    enum: PageOrder,
    default: PageOrder.DESC,
    description: 'Sort order by project creation date (newest first by default)',
  })
  readonly order?: PageOrder = PageOrder.DESC;
}
