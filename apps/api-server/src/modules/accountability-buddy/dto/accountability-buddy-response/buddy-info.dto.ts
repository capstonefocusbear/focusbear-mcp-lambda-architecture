import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BuddyInfoDto {
  @ApiPropertyOptional({ type: String, nullable: true })
  id?: string | null;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  first_name?: string;

  @ApiPropertyOptional()
  last_name?: string;
}
