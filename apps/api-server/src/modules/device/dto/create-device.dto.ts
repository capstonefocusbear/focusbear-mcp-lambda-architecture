import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsNotEmpty, IsOptional } from 'class-validator';
import { DeviceMetadata } from '../domain/device-metadata.model';
import { OperatingSystem } from '../domain/operating-system.enum';

export class CreateDeviceDto {
  @IsNotEmpty()
  @IsEnum(OperatingSystem)
  @IsIn(Object.values(OperatingSystem))
  @ApiProperty({ enum: OperatingSystem })
  operating_system: OperatingSystem;

  @IsOptional()
  metadata?: any | DeviceMetadata; // no model for now
}
