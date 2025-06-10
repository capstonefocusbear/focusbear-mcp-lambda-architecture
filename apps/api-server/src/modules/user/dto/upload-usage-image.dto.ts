import { IsString, IsOptional, IsDate, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class UploadUsageImageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  imageKey: string;

  @IsDate()
  @Type(() => Date)
  @Transform(({ value }) => new Date(value))
  usageStartDate: Date;

  @IsDate()
  @Type(() => Date)
  @Transform(({ value }) => new Date(value))
  usageEndDate: Date;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  platform?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  deviceId?: string;
}
