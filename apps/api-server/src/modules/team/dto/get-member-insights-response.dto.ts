import { ApiProperty } from '@nestjs/swagger';
import { GetTeamMembersDetailsDto } from './team-member-details.dto';
import { MemberDeviceDto } from './member-device.dto';

export class GetMemberInsightsResponseDto {
  @ApiProperty({ type: GetTeamMembersDetailsDto })
  member: GetTeamMembersDetailsDto;

  @ApiProperty({ type: [MemberDeviceDto] })
  devices: MemberDeviceDto[];
}
