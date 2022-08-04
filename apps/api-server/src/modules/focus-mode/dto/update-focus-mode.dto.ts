import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';

export class UpdateFocusModeDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsArray()
  @IsOptional()
  @ValidateIf((o) => o.allowed_urls?.length > 0)
  @IsString({ each: true })
  @IsUrl({}, { each: true })
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
}
