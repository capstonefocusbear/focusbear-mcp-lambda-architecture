import { IsEnum } from 'class-validator';
import { CoursePlatform } from '../domain/course-platform.enum';
import { ApiProperty } from '@nestjs/swagger';

export class SyncPlatformCoursesDto {
  @ApiProperty({
    enum: CoursePlatform,
    default: CoursePlatform.WEB,
  })
  @IsEnum(CoursePlatform)
  platform: CoursePlatform;
}
