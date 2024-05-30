import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class SavedWebsiteDto {
  @IsNotEmpty()
  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  metadata?: any;

  @IsOptional()
  @MaxLength(255, {
    message: 'note should has a length at most 255 characters',
  })
  note?: string;
}
