import { IsNotEmpty } from 'class-validator';

export class CreateLessonCompletionDto {
  @IsNotEmpty()
  course_id: string;

  @IsNotEmpty()
  lesson_id: string;
}
