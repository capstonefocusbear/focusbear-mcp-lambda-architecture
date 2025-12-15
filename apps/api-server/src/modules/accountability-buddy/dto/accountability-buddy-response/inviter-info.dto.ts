import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InviterInfoDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  first_name?: string;

  @ApiPropertyOptional()
  last_name?: string;
}
