import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCourseEnrolmentDto {
  @IsNotEmpty()
  @IsString()
  course_id: string;

  @IsNotEmpty()
  @IsString()
  lesson_id: string;
}
