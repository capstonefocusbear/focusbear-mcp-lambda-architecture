import { IsIn, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateProfileImageUploadUrlQueryDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_-][a-zA-Z0-9_. -]{0,198}\.[a-zA-Z0-9]{1,10}$/, {
    message: 'Filename must contain only alphanumeric characters, dashes, underscores, dots, and spaces.',
  })
  filename: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['image/jpeg', 'image/png', 'image/gif', 'image/webp'], {
    message: 'Invalid file type. Please upload an image file (jpeg, png, gif, or webp).',
  })
  content_type: string;
}
