import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteLessonDto {
  @IsNotEmpty()
  @IsString()
  course_id: string;

  @IsNotEmpty()
  @IsString()
  lesson_id: string;
}
