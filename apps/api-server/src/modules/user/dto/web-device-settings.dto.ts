import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OnboardingDto } from './onboarding';

export class WebDeviceSettingsDto {
  @IsBoolean()
  hasEditedSettings?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => OnboardingDto)
  onboarding?: OnboardingDto;
}
