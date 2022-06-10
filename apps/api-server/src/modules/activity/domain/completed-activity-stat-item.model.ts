import { ApiProperty } from '@nestjs/swagger';

export class CompletedActivityStatItem {
  @ApiProperty()
  date?: string;

  @ApiProperty()
  summary?: string;
}
