import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCourseRatingDto {
  @IsNotEmpty()
  @IsString()
  rating: number;

  @IsNotEmpty()
  @IsString()
  course_id: string;

  @IsString()
  review?: string;
}
