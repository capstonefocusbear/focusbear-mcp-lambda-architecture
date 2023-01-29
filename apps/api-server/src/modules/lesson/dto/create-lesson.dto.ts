import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import { Lesson } from '../entities/lesson.entity';

export class CreateLessonDto {
  @IsNotEmpty()
  @IsString()
  course_id: string;

  @IsNotEmpty()
  @IsArray()
  @Type(() => Lesson)
  lessons: Lesson[];
}
