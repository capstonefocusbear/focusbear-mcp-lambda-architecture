import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CoursePlatform } from '../domain/course-platform.enum';

export class SyncPlatformCoursesDto {
  @ApiProperty({
    enum: CoursePlatform,
    default: CoursePlatform.WEB,
  })
  @IsEnum(CoursePlatform)
  platform: CoursePlatform;
}
