import { IsBoolean, IsEnum } from 'class-validator';
import { BearsonaProfile } from '../../domain/onboarding/bearsona-profile.enum';

export class BearsonaProfileDto {
  @IsEnum(BearsonaProfile)
  name: BearsonaProfile;

  @IsBoolean()
  useProfileLang: boolean;
}
