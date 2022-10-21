import { IsUUID, IsNotEmpty } from 'class-validator';

export class DeleteHabitPackParamDto {
  @IsNotEmpty()
  @IsUUID('4')
  pack_id?: string;
}
