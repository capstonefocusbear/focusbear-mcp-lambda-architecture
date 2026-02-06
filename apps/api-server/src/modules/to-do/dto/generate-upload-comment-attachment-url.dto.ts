import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateUploadCommentAttachmentUrlDto {
  @ApiProperty({ description: 'Original file name', maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  file_name: string;

  @ApiProperty({ description: 'MIME type of the file', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  content_type: string;
}
