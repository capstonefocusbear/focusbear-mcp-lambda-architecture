import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, IsUUID, IsNotEmpty, IsBoolean, IsArray, ValidateIf } from 'class-validator';
import { MarketplaceRequestType } from '../../habit-pack/domain/marketplace-request.enum';
import { CreateFocusModeTagDto } from '../../focus-mode/dto/create-focus-mode-tag.dto';

export class UpsertFocusModeTemplateDto {
  @IsNotEmpty()
  @IsUUID('4')
  id: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  author_name?: string;

  @IsArray()
  @IsOptional()
  @ValidateIf((o) => o.allowed_urls?.length > 0)
  @IsString({ each: true })
  @ApiProperty()
  allowed_urls?: string[];

  @IsArray()
  @IsOptional()
  @ValidateIf((o) => o.allowed_apps?.length > 0)
  @IsString({ each: true })
  @ApiProperty()
  allowed_apps?: string[];

  @IsOptional()
  @IsArray()
  tags?: CreateFocusModeTagDto[];

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  @ValidateIf((e) => e.description_video_url !== '')
  description_video_url?: string;

  @IsNotEmpty()
  @IsString()
  welcome_message: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  @ValidateIf((e) => e.welcome_video_url !== '')
  welcome_video_url?: string;

  @IsOptional()
  @IsString()
  marketplace_request?: MarketplaceRequestType;

  @IsOptional()
  @IsBoolean()
  marketplace_approval_status?: boolean;

  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @IsOptional()
  @IsBoolean()
  featured_for_onboarding?: boolean;

  @IsOptional()
  @IsString()
  language?: string;
}
