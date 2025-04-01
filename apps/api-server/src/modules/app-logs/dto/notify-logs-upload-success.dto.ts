import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class NotifyLogsUploadSuccessDto {
  @IsNotEmpty()
  @IsUrl()
  uploaded_file_url: string;

  @ApiProperty({ type: 'string' })
  @IsNotEmpty()
  @IsString()
  feedback_message: string;

  @ApiProperty({ type: 'string' })
  @IsNotEmpty()
  @IsString()
  app_platform: string;

  @ApiProperty({ type: 'string' })
  @IsNotEmpty()
  @IsString()
  app_version: string;
}
