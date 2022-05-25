import { IsNotEmpty, IsUUID } from 'class-validator';

export class GetUserSettingsDto {
  @IsNotEmpty()
  @IsUUID()
  user_id: string;
}
