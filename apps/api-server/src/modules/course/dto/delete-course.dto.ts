import { IsBoolean, IsNotEmpty } from 'class-validator';

export class DeleteCourseDto {
  @IsNotEmpty()
  @IsBoolean()
  deleted: boolean;
}
