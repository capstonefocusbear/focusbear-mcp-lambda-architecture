import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetAnnouncementsQueryDto {
  @IsString()
  @ApiProperty({
    enum: ['iOS', 'Android', 'MacOS', 'Windows', 'Web', 'Unknown'],
    description: 'Operating system name (case-insensitive)',
    example: 'iOS',
  })
  os_name: string;
}
