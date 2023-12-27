import { IsArray, IsNotEmpty, IsString, ValidateNested, isArray } from 'class-validator';
import { Lesson } from '../entities/lesson.entity';
import { Type } from 'class-transformer';

export class UpsertLessonsDto {
  @IsNotEmpty()
  @IsString()
  course_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Lesson)
  lessons: Lesson[];
}
