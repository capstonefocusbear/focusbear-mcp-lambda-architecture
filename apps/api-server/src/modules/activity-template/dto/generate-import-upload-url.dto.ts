import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class GenerateImportUploadUrlDto {
  @IsNotEmpty()
  @IsIn(['image', 'audio'])
  mediaType!: 'image' | 'audio';

  @IsNotEmpty()
  @IsString()
  fileExtension!: string;
}
