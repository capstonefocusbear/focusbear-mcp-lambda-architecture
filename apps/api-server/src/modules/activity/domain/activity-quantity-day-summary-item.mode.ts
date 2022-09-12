import { ApiProperty } from '@nestjs/swagger';

export class ActivityQuantityDaySummaryItem {
  @ApiProperty()
  name: string;

  @ApiProperty()
  quantity: number;
}
