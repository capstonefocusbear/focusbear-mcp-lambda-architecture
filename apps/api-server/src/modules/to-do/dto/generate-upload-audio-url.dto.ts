import { IsIn, IsString } from 'class-validator';

export class GenerateUploadAudioUrlDto {
  @IsString()
  @IsIn(['mp3', 'm4a', 'wav'])
  fileExtension!: string;
}
