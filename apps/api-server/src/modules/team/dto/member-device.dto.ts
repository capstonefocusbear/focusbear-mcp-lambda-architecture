import { ApiProperty } from '@nestjs/swagger';

export class MemberDeviceDto {
  @ApiProperty({ example: '9b7c6f2d-1234-4e5f-89ab-0123456789cd', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'MacOS', description: 'Operating system label' })
  operating_system: string;

  @ApiProperty({ example: '1.2.3', required: false, nullable: true })
  app_version?: string | null;

  @ApiProperty({ example: true })
  is_leader: boolean;

  @ApiProperty({ example: '2024-01-10T09:00:00.000Z', format: 'date-time' })
  created_at: string;

  @ApiProperty({ example: '2024-04-10T09:00:00.000Z', format: 'date-time' })
  updated_at: string;
}
