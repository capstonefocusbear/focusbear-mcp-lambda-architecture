import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Platform } from '../../../shared/domain/platform.enum';

export class CreateCourseDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;
}
