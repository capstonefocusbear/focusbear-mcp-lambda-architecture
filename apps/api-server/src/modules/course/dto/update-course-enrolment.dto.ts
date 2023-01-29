import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class UpdateCourseEnrolmentDto {
  @IsNotEmpty()
  @IsString()
  course_id: string;

  @IsNotEmpty()
  @IsBoolean()
  finished: boolean;
}
