import { Type } from 'class-transformer';
import { IsDate, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateUserMetadataDto {
  @IsOptional()
  @IsString()
  profile_image?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  last_email_sent?: Date;

  @IsOptional()
  @IsObject()
  email_preferences?: Record<string, any>;
}
