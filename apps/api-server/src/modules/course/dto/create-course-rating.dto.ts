import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, Max, MaxLength } from 'class-validator';
import { COURSE } from '../constants/course.constants';

export class CreateCourseRatingDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(COURSE.RATING.MIN)
  @Max(COURSE.RATING.MAX)
  rating: number;

  @IsNotEmpty()
  @IsString()
  course_id: string;

  @IsString()
  @IsOptional()
  @MaxLength(COURSE.RATING.REVIEW_MAX_LENGTH)
  review?: string;
}
