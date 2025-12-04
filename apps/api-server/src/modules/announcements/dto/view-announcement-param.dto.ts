import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ViewAnnouncementParamDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({
    description: 'Announcement ID following the format: ann_YYYY_MM_<title>',
    example: 'ann_2025_11_release_ios_2_0_0',
  })
  id: string;
}
