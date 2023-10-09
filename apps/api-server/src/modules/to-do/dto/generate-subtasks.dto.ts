import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateSubtasksDto {
  @IsNotEmpty()
  @IsString()
  task: string;

  @IsNotEmpty()
  @IsString()
  language: string;
}
