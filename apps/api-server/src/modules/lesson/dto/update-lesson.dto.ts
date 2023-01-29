import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateLessonDto {
  @IsNotEmpty()
  @IsString()
  course_id: string;

  @IsNotEmpty()
  @IsString()
  lesson_id: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsNotEmpty()
  @IsString()
  url: string;
}
