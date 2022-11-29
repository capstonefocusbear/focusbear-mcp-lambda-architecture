import { IsOptional, IsString } from 'class-validator';

export class GetUserSettingsQueryDto {
  @IsOptional()
  @IsString()
  timezone?: string;
}
