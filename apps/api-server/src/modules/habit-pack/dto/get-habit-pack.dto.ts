import { IsUUID, IsNotEmpty } from 'class-validator';

export class GetHabitPackParamDto {
  @IsNotEmpty()
  @IsUUID('4')
  pack_id?: string;
}
