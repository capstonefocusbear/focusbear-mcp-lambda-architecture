import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { OperatingSystem } from '../../../shared/domain/operating-system.enum';
import { CreateDeviceDto } from './create-device.dto';

export class UpdateDeviceDto extends CreateDeviceDto {
  @IsOptional()
  @IsEnum(OperatingSystem)
  @IsIn(Object.values(OperatingSystem))
  @ApiProperty({ enum: OperatingSystem })
  operating_system: OperatingSystem;
}
