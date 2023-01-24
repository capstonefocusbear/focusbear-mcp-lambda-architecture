import { IsOptional, IsString } from 'class-validator';

export class UpdateUserMetadataDto {
  @IsOptional()
  @IsString()
  profile_image?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
