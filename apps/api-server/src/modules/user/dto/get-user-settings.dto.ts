import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class GetUserSettingsDto {
  @IsNotEmpty()
  @IsUUID()
  user_id: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
