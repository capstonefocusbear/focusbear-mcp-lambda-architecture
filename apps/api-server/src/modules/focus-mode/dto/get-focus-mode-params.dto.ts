import { IsNotEmpty, IsUUID } from 'class-validator';

export class GetFocusModeParamsDto {
  @IsNotEmpty()
  @IsUUID('4')
  focus_mode_id: string;
}
