import { ApiProperty } from '@nestjs/swagger';

export class CompletedActivityStatItem {
  constructor({ date, summary, count }: CompletedActivityStatItem) {
    this.date = date;
    this.summary = summary;
    this.count = count;
  }

  @ApiProperty()
  date?: string;

  @ApiProperty({ description: 'Duration in seconds or quantity logged (stringified integer)' })
  summary?: string;

  @ApiProperty({ description: 'Number of completions for this day (stringified integer)' })
  count?: string;
}
