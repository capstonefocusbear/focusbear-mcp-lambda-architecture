import { IsOptional } from 'class-validator';

export class UpdateLocalDeviceSettingsDto {
  @IsOptional()
  MacOS?: any;

  @IsOptional()
  Windows?: any;

  @IsOptional()
  Android?: any;

  @IsOptional()
  iOS?: any;
}
