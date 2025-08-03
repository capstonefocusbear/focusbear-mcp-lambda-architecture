import { Type } from 'class-transformer';
import { IsNotEmpty, IsUUID, ValidateNested } from 'class-validator';
import { OnboardingDto } from '.';

export class UpdateOnboardingProgressDto {
  @IsNotEmpty()
  @IsUUID()
  user_id: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => OnboardingDto)
  onboarding: OnboardingDto;
}
