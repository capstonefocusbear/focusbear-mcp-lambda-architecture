import { IsOptional, IsString, IsUrl, IsArray, IsUUID, IsNotEmpty, IsBoolean, ValidateIf } from 'class-validator';
import { UpdateActivityTemplateDto } from '../../activity-template/dto/activity-template.dto';
import { HabitPackType } from '../domain/habit-pack-type.enum';
import { MarketplaceRequestType } from '../domain/marketplace-request.enum';

export class UpsertHabitPackDto {
  @IsNotEmpty()
  @IsUUID('4')
  id?: string;

  @IsNotEmpty()
  @IsString()
  pack_name?: string;

  @IsOptional()
  @IsString()
  creator_name?: string;

  @IsNotEmpty()
  @IsString()
  pack_type?: HabitPackType;

  @IsNotEmpty()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  @ValidateIf((e) => e.description_video_url !== '')
  description_video_url?: string;

  @IsOptional()
  @IsString()
  welcome_message?: string;

  @IsOptional()
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
  @IsArray()
  morning_activities?: UpdateActivityTemplateDto[];

  @IsOptional()
  @IsArray()
  break_activities?: UpdateActivityTemplateDto[];

  @IsOptional()
  @IsArray()
  evening_activities?: UpdateActivityTemplateDto[];

  @IsOptional()
  @IsArray()
  standalone_activities?: UpdateActivityTemplateDto[];
}
