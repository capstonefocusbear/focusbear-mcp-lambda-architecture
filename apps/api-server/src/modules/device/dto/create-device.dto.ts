import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { DeviceMetadata } from '../domain/device-metadata.model';
import { OperatingSystem } from '../../../shared/domain/operating-system.enum';

export class CreateDeviceDto {
  @IsNotEmpty()
  @IsEnum(OperatingSystem)
  @IsIn(Object.values(OperatingSystem))
  @ApiProperty({ enum: OperatingSystem })
  operating_system: OperatingSystem;

  @IsOptional()
  @IsObject()
  metadata?: any | DeviceMetadata; // no model for now
}
