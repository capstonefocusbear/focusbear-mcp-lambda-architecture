import { ApiProperty } from '@nestjs/swagger';
import { GetTeamMembersDetailsDto } from './team-member-details.dto';

export class GetAllTeamMembersResponseDto {
  @ApiProperty({ type: [GetTeamMembersDetailsDto] })
  members: GetTeamMembersDetailsDto[];

  @ApiProperty({ type: [String] })
  admins: string[];

  @ApiProperty({ example: 25 })
  total_count: number;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  team_id: string;
}
