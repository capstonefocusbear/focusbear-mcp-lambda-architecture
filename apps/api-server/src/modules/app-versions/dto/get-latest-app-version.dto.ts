import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  APP_VERSIONS_OS_DISPLAY_VALUES,
  APP_VERSIONS_OS_QUERY_VALUES,
  AppVersionsOsQueryValue,
} from '../app-versions.constants';

export class GetLatestAppVersionQueryDto {
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value), { toClassOnly: true })
  @IsIn(APP_VERSIONS_OS_QUERY_VALUES)
  @ApiProperty({
    enum: APP_VERSIONS_OS_DISPLAY_VALUES,
    description: 'Operating system name (case-insensitive)',
    example: 'iOS',
  })
  os_name: AppVersionsOsQueryValue;

  @IsBoolean()
  @IsOptional()
  @Transform(({ obj, key }) => {
    const value = obj[key];
    if (typeof value === 'string') {
      return obj[key] === 'true';
    }
    return value;
  })
  @ApiProperty({
    type: Boolean,
    required: false,
    default: false,
    description: 'Include beta versions',
  })
  is_beta?: boolean;
}
