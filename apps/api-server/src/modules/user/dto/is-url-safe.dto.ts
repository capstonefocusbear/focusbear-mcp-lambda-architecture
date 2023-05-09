import { IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';

export class IsUrlSafeDto {
  @IsUrl()
  @IsOptional()
  @ValidateIf((dto) => dto.url !== '')
  url: string;

  @IsOptional()
  @IsString()
  tab_title: string;

  @IsOptional()
  @IsString()
  meta_description: string;

  @IsOptional()
  @IsString()
  focus_mode: string;

  @IsOptional()
  @IsString()
  intention: string;

  @IsOptional()
  @IsString()
  language = 'English';
}
