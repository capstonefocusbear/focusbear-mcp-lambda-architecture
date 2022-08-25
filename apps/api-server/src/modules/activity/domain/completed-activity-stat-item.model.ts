import { ApiProperty } from '@nestjs/swagger';

export class CompletedActivityStatItem {
  constructor({ date, summary }: CompletedActivityStatItem) {
    this.date = date;
    this.summary = summary;
  }

  @ApiProperty()
  date?: string;

  @ApiProperty()
  summary?: string;
}
