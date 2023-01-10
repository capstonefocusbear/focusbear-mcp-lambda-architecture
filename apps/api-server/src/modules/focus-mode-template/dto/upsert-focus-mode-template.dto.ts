import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, IsUUID, IsNotEmpty, IsBoolean, IsArray, ValidateIf } from 'class-validator';
import { MarketplaceRequestType } from '../../habit-pack/domain/marketplace-request.enum';

export class UpsertFocusModeTemplateDto {
  @IsOptional()
  @IsUUID('4')
  id?: string;

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

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  description_video_url?: string;

  @IsNotEmpty()
  @IsString()
  welcome_message: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  welcome_video_url?: string;

  @IsOptional()
  @IsString()
  marketplace_request?: MarketplaceRequestType;

  @IsOptional()
  @IsBoolean()
  marketplace_approval_status?: boolean;

  @IsOptional()
  @IsString()
  language?: string;
}
