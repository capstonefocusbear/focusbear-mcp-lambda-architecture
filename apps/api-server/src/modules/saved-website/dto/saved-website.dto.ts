import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class SavedWebsiteDto {
  @IsNotEmpty()
  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  metadata?: any;
}
