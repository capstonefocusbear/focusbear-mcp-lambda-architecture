import { Type } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { ProfileImageDto } from './ProfileImage.model';

export class UpdateUserMetadataDto {
  @IsOptional()
  @Type(() => ProfileImageDto)
  profile_image?: ProfileImageDto;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  user_job_details?: string;

  @IsOptional()
  @IsString()
  user_typical_distractions?: string;
}
