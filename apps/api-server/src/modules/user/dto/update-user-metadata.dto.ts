import { Transform } from 'class-transformer';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateUserMetadataDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && typeof value.url === 'string') return value.url;
    return value;
  })
  @IsString()
  profile_image?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  email_preferences?: Record<string, any>;

  @IsOptional()
  @IsString()
  user_job_details?: string;

  @IsOptional()
  @IsString()
  user_typical_distractions?: string;
}
