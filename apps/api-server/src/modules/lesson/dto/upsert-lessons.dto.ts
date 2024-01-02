import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Lesson } from '../entities/lesson.entity';

export class UpsertLessonsDto {
  @IsNotEmpty()
  @IsString()
  course_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Lesson)
  lessons: Lesson[];
}
