import { IsBoolean, IsEnum, IsArray, IsObject, IsString, ValidateNested, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateActivityDto } from '../../../activity/dto/update-activity.dto';
import { OnboardFlowStep } from '../../domain/onboarding/onboarding-flow-step.enum';
import { OnboardFlowFeature } from '../../domain/onboarding/onboarding-flow-feature.enum';
import { RoutineType } from '../../domain/routine-type.enum';
import { BearsonaProfile } from '../../domain/onboarding/bearsona-profile.enum';
import { OnboardFlowTimeUI } from '../../domain/onboarding/onboarding-flow-time-ui.enum';
import { BearsonaProfileDto } from './bearsona-profile.dto';
import { ActivitiesDto } from './activities.dto';

export class OnboardingDto {
  @IsEnum(OnboardFlowStep)
  currentStep: OnboardFlowStep;

  @IsArray()
  @IsEnum(OnboardFlowFeature, { each: true })
  features: OnboardFlowFeature[];

  @IsArray()
  @IsEnum(RoutineType, { each: true })
  routines: RoutineType[];

  @IsObject()
  @ValidateNested()
  @Type(() => BearsonaProfileDto)
  profile: {
    name: BearsonaProfile;
    useProfileLang: boolean;
  };

  @IsObject()
  @ValidateNested()
  @Type(() => ActivitiesDto)
  activities: {
    morning_activities: UpdateActivityDto[];
    evening_activities: UpdateActivityDto[];
  };

  @IsArray()
  @IsString({ each: true })
  selectedGoals: string[];

  @IsObject()
  times: Record<OnboardFlowTimeUI, string>;

  @IsString()
  currentTimeUI: OnboardFlowTimeUI | 'summary';

  @IsNumber()
  @Min(0)
  @Max(999)
  break_after_minutes: number;

  @IsBoolean()
  showSkipOnboardingModal: boolean;

  @IsBoolean()
  isSyncingUserSelection: boolean;
}
