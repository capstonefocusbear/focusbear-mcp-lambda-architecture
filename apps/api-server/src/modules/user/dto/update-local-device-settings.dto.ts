import { IsOptional } from 'class-validator';
import { WebDeviceSettingsDto } from './web-device-settings.dto';

export class UpdateLocalDeviceSettingsDto {
  @IsOptional()
  MacOS?: any;

  @IsOptional()
  Windows?: any;

  @IsOptional()
  Android?: any;

  @IsOptional()
  iOS?: any;

  @IsOptional()
  Web?: WebDeviceSettingsDto;
}
