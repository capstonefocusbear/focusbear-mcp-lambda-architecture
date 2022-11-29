import { IsOptional, IsString } from 'class-validator';

export class UpdateUserSettingsQueryDto {
  @IsOptional()
  @IsString()
  timezone?: string;
}
