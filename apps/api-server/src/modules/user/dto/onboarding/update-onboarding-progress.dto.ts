import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { OnboardingDto } from '.';

export class UpdateOnboardingProgressDto {
  @IsNotEmpty()
  @IsString()
  auth0_id: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OnboardingDto)
  onboarding?: OnboardingDto;
}
