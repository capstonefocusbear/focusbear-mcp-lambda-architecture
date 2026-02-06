import { IsNotEmpty, IsString, MaxLength, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaskAttachmentDto {
  @ApiProperty({ description: 'Original file name', maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  file_name: string;

  @ApiProperty({ description: 'R2 storage key for the file', maxLength: 1000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  file_key: string;

  @ApiProperty({ description: 'MIME type of the file', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  content_type: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsNumber()
  @Min(1)
  file_size: number;
}
