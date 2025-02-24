import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateUploadPresignedUrlQueryDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['text/plain', 'application/zip'], {
    message: 'Invalid file type. Please upload a .txt or a .zip file.',
  })
  mimetype: string;
}
