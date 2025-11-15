import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaParameters } from './pagination-meta-parameters.interface';
import { PageOrder } from '../domain/page-order.enum';

export class PaginationMetaDto {
  @ApiProperty()
  readonly page: number;

  @ApiProperty()
  readonly take: number;

  @ApiProperty({ enum: PageOrder })
  readonly order: PageOrder;

  @ApiProperty()
  readonly itemCount: number;

  @ApiProperty()
  readonly pageCount: number;

  @ApiProperty()
  readonly hasPreviousPage: boolean;

  @ApiProperty()
  readonly hasNextPage: boolean;

  constructor({ paginationOptionsDto, itemCount }: PaginationMetaParameters) {
    this.page = paginationOptionsDto.page;
    this.take = paginationOptionsDto.take;
    this.order = paginationOptionsDto.order || PageOrder.ASC;
    this.itemCount = itemCount;
    this.pageCount = Math.ceil(this.itemCount / this.take);
    this.hasPreviousPage = this.page > 1;
    this.hasNextPage = this.page < this.pageCount;
  }
}
