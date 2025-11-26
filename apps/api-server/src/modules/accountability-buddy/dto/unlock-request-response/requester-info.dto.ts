import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequesterInfoDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  first_name?: string;

  @ApiPropertyOptional()
  last_name?: string;
}
