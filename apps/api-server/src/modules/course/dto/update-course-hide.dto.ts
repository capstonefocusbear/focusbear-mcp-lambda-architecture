import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateCourseHideDto {
  @IsNotEmpty()
  @IsBoolean()
  should_hide: boolean;
}
