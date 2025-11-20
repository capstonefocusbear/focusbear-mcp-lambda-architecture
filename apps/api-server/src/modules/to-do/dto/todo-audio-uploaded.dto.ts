import { IsNotEmpty, IsString } from 'class-validator';

export class TodoAudioUploadedDto {
  @IsString()
  @IsNotEmpty()
  audioKey!: string;
}
