import { IsOptional, IsString } from 'class-validator';
import { CreateFocusModeDto } from './create-focus-mode.dto';

export class UpdateFocusModeDto extends CreateFocusModeDto {
  @IsOptional()
  @IsString()
  name: string;
}
