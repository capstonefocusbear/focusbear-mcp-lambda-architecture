import { IsOptional, IsString } from 'class-validator';

export class UpdateLocalDeviceSettingsDto {
  @IsString()
  @IsOptional()
  MacOS?: string;

  @IsString()
  @IsOptional()
  Windows?: string;

  @IsString()
  @IsOptional()
  Android?: string;

  @IsString()
  @IsOptional()
  iOS?: string;
}
