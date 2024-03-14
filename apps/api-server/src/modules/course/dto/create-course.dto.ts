import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CoursePlatform } from '../domain/course-platform.enum';
import { Type } from 'class-transformer';

export class CreateCourseDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsEnum(CoursePlatform)
  platform?: CoursePlatform;
}
