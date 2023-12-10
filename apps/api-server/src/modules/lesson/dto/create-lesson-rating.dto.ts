import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateLessonRatingDto {
  @IsNotEmpty()
  @IsNumber()
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
