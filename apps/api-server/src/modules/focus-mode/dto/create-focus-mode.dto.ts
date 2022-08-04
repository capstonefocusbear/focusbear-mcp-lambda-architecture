import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { UpdateFocusModeDto } from './update-focus-mode.dto';

export class CreateFocusModeDto extends UpdateFocusModeDto {
  @IsOptional()
  @IsUUID()
  id: string;

  @IsNotEmpty()
  @IsString()
  name: string;
}
