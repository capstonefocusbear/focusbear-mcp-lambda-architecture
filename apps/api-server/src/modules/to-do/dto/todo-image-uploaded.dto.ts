import { IsNotEmpty, IsString } from 'class-validator';

export class TodoImageUploadedDto {
  @IsString()
  @IsNotEmpty()
  imageKey!: string;
}
