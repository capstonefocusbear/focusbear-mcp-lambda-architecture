import { IsBoolean } from 'class-validator';

export class WebDeviceSettingsDto {
  @IsBoolean()
  hasEditedSettings?: boolean;
}
