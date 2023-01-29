import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateCourseDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;
}
