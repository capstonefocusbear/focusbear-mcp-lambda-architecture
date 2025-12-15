import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetUserSummaryQueryDto {
  @ApiPropertyOptional({
    description: 'Optional source identifier for the request (e.g. dashboard).',
    example: 'dashboard',
  })
  @IsOptional()
  @IsString()
  from?: string;
}
