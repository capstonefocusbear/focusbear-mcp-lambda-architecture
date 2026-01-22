import { ApiProperty } from '@nestjs/swagger';
import { AnnouncementEntity } from '../entities/announcements.entity';

export class GetAnnouncementsResponseDto {
  @ApiProperty({
    type: [AnnouncementEntity],
    description: 'List of active, unread announcements for the user',
    example: [
      {
        id: 'ann_2024_11_maintenance',
        type: 'maintenance',
        heading: 'Scheduled Maintenance',
        details: "We'll be performing system maintenance on Nov 25th from 2-4 AM UTC.",
        details_url: 'https://example.com/maintenance-info',
        expiry_date: '2024-11-26T00:00:00.000Z',
        priority: 'high',
        operating_system: 'iOS',
        created_at: '2024-11-15T10:00:00.000Z',
        updated_at: '2024-11-15T10:00:00.000Z',
      },
    ],
  })
  announcements: AnnouncementEntity[];
}
