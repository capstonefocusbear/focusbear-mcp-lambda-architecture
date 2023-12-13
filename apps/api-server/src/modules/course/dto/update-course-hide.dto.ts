import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateCourseHideDto {
  @IsNotEmpty()
  @IsBoolean()
  hidden: boolean;
}
