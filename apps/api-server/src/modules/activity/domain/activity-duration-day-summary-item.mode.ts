import { ApiProperty } from '@nestjs/swagger';

export class ActivityDurationDaySummaryItem {
  @ApiProperty()
  name: string;

  @ApiProperty()
  duration: number;
}
