import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateCourseRatingDto {
  @IsNotEmpty()
  @IsNumber()
  rating: number;

  @IsNotEmpty()
  @IsString()
  course_id: string;

  @IsString()
  review?: string;
}
