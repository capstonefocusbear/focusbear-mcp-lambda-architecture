import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class GetLatestAppVersionQueryDto {
  @IsString()
  @ApiProperty({
    enum: ['iOS', 'Android', 'MacOS', 'Windows', 'Web', 'Unknown'],
    description: 'Operating system name',
    example: 'iOS',
  })
  os_name: string;

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
