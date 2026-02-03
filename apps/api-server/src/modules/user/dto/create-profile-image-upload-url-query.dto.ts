import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateProfileImageUploadUrlQueryDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['image/jpeg', 'image/png', 'image/gif', 'image/webp'], {
    message: 'Invalid file type. Please upload an image file (jpeg, png, gif, or webp).',
  })
  content_type: string;
}
