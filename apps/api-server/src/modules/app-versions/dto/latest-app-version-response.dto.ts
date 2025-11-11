import { ApiProperty } from '@nestjs/swagger';

export class LatestAppVersionResponseDto {
  @ApiProperty({ example: '2.0.0', description: 'Minimum supported version' })
  minimum_supported_app_version: string | null;

  @ApiProperty({ example: '2.1.0', description: 'Latest available version' })
  latest_app_version: string | null;

  @ApiProperty({ example: 'Bug fixes and performance improvements', description: 'Release notes' })
  release_notes: string | null;
}
