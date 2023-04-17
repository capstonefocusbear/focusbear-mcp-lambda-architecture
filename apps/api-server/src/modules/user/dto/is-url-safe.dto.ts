import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class IsUrlSafeDto {
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @IsNotEmpty()
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
