import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class GetLatestAppVersionQueryDto {
  @IsString()
  @ApiProperty({
    enum: ['iOS', 'Android', 'MacOS', 'Windows'],
    description: 'Operating system name',
    example: 'iOS',
  })
  os_name: string;

  // Version 1
  // @IsBoolean()
  // @IsOptional()
  // @Transform(({ value }) => {
  //   if (value === undefined || value === null) return false;
  //   if (typeof value === 'boolean') return value;
  //   if (typeof value === 'string') {
  //     return value.toLowerCase() === 'true';
  //   }
  //   return false;
  // })
  // @ApiProperty({
  //   type: Boolean,
  //   required: false,
  //   default: false,
  //   description: 'Include beta versions',
  // })
  // is_beta?: boolean;

  // Version 2
  // @IsBoolean()
  // @IsOptional()
  // @ApiProperty({
  //   type: Boolean,
  //   required: false,
  //   description: 'Include beta versions',
  // })
  // is_beta?: boolean;

  is_beta?: boolean; // Working
}
