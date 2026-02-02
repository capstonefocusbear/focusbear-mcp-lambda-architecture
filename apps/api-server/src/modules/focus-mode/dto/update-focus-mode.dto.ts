import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsObject, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { CreateFocusModeTagDto } from './create-focus-mode-tag.dto';

export class UpdateFocusModeDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsArray()
  @IsOptional()
  @ValidateIf((o) => o.allowed_urls?.length > 0)
  @IsString({ each: true })
  // @IsUrl({}, { each: true })
  @ApiProperty()
  allowed_urls?: string[];

  @IsArray()
  @IsOptional()
  @ValidateIf((o) => o.allowed_apps?.length > 0)
  @IsString({ each: true })
  @ApiProperty()
  allowed_apps?: string[];

  @IsOptional()
  @IsObject()
  metadata?: any; // no model for now

  @IsOptional()
  @IsArray()
  tags?: CreateFocusModeTagDto[];

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ required: false })
  is_ai_enabled?: boolean;
}
