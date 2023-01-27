import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ActivityImageData {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  file_path: string;
}
