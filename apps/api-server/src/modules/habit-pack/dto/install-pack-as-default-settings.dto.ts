import { IsUUID, IsNotEmpty } from 'class-validator';

export class InstallPackAsDefaultSettingsDto {
  @IsNotEmpty()
  @IsUUID('4')
  pack_id?: string;
}
