import { IsBoolean, IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OperatingSystem } from '../domain/operating-system.enum';

export class SearchDeviceQueryDto {
  @IsOptional()
  @IsUUID()
  device_id?: string;

  @IsOptional()
  @IsBoolean()
  is_leader?: boolean;

  @IsOptional()
  @IsString()
  app_version?: string;

  @IsOptional()
  @IsEnum(OperatingSystem)
  @IsIn(Object.values(OperatingSystem))
  @ApiProperty({ enum: OperatingSystem })
  operating_system?: OperatingSystem;
}
