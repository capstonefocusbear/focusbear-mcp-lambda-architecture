import { IsUUID, IsNotEmpty, IsEnum, IsIn } from 'class-validator';
import { DefaultPackFormatType } from '../domain/install-pack-format.enum';

export class InstallPackAsDefaultSettingsDto {
  @IsNotEmpty()
  @IsUUID('4')
  pack_id?: string;

  @IsNotEmpty()
  @IsEnum(DefaultPackFormatType)
  @IsIn(Object.values(DefaultPackFormatType))
  format?: DefaultPackFormatType;
}
