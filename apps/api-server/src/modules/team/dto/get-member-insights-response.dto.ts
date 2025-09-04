import { ApiProperty } from '@nestjs/swagger';
import { GetTeamMembersDetailsDto } from './team-member-details.dto';

export class GetMemberInsightsResponseDto {
  @ApiProperty({ type: GetTeamMembersDetailsDto })
  member: GetTeamMembersDetailsDto;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        operating_system: { type: 'string' },
        app_version: { type: 'string', nullable: true },
        is_leader: { type: 'boolean' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
      },
    },
  })
  devices: Array<{
    id: string;
    operating_system: string;
    app_version?: string;
    is_leader: boolean;
    created_at: string;
    updated_at: string;
  }>;
}
