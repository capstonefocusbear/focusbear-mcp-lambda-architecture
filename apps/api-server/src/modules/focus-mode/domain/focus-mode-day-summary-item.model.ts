import { ApiProperty } from '@nestjs/swagger';

export class FocusModeDaySummaryItem {
  @ApiProperty()
  name: string;

  @ApiProperty()
  start_time: Date;

  @ApiProperty()
  duration: number;

  @ApiProperty()
  achievements: string;

  @ApiProperty()
  distractions: string;

  @ApiProperty()
  tags: string[];
}
