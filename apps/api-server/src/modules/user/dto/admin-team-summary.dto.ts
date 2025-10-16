import { ApiProperty } from '@nestjs/swagger';

export class AdminTeamSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}
