import { IsNotEmpty, IsString } from 'class-validator';

export class CreateLessonRatingDto {
  @IsNotEmpty()
  @IsString()
  rating: number;

  @IsNotEmpty()
  @IsString()
  course_id: string;

  @IsNotEmpty()
  @IsString()
  lesson_id: string;

  @IsString()
  review?: string;
}
