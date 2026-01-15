import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OperatingSystem } from '../../../shared/domain/operating-system.enum';

export class CreateAppVersionDto {
  @IsNotEmpty()
  @IsEnum([
    OperatingSystem.iOS,
    OperatingSystem.Android,
    OperatingSystem.MacOS,
    OperatingSystem.Windows,
    OperatingSystem.Web,
  ])
  @ApiProperty({
    enum: ['iOS', 'Android', 'MacOS', 'Windows', 'Web'],
    description: 'Operating system',
    example: OperatingSystem.iOS,
  })
  operating_system: OperatingSystem;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d+\.\d+\.\d+(-[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*)?$/, {
    message: 'semver_string must be valid semantic version (e.g., 2.1.0 or 2.1.0-beta.1)',
  })
  @ApiProperty({
    example: '2.9.0',
    description: 'Semantic version string',
  })
  semver_string: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    default: false,
    description: 'Mark as minimum supported version',
    required: false,
  })
  is_supported?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    default: false,
    description: 'Only available to beta testers',
    required: false,
  })
  is_beta_only?: boolean;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'Bug fixes and performance improvements',
    description: 'Release notes',
    required: false,
  })
  release_notes?: string;
}
