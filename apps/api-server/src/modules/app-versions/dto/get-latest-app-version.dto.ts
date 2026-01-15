import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { OperatingSystem } from '../../../shared/domain/operating-system.enum';

export class GetLatestAppVersionQueryDto {
  @IsString()
  @IsEnum([
    OperatingSystem.iOS,
    OperatingSystem.Android,
    OperatingSystem.MacOS,
    OperatingSystem.Windows,
    OperatingSystem.Web,
  ])
  @ApiProperty({
    enum: ['iOS', 'Android', 'MacOS', 'Windows', 'Web'],
    description: 'Operating system name',
    example: 'iOS',
  })
  os_name: OperatingSystem;

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
