import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Platform } from '../../../shared/domain/platform.enum';

export class SyncPlatformCoursesDto {
  @ApiProperty({
    enum: Platform,
    default: Platform.WEB,
  })
  @IsEnum(Platform)
  platform: Platform;
}
