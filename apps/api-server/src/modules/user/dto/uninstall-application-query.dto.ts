import { IsNotEmpty, IsString } from 'class-validator';

export class UninstallApplicationQueryDto {
  @IsNotEmpty()
  @IsString()
  app_platform: string;

  @IsNotEmpty()
  @IsString()
  app_version: string;

  @IsNotEmpty()
  @IsString()
  feedback_message: string;

  @IsNotEmpty()
  @IsString()
  log_url: string;
}
