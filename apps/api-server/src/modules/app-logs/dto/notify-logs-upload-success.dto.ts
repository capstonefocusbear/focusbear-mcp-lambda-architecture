import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches } from 'class-validator';

export class NotifyLogsUploadSuccess {
  @ApiProperty({
    example: 'https://xxxxxxxxxxxxxxxxxxxx.r2.cloudflarestorage.com/xxxxxxxx',
    description: 'The URL of the uploaded file.',
  })
  @IsNotEmpty()
  @Matches(/^https:\/\/f3db181aa5e95c474bda11234481eea9\.r2\.cloudflarestorage\.com\/.*$/, {
    message: 'Uploaded file URL is not valid',
  })
  uploaded_file_url: string;
}
