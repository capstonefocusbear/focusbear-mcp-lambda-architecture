import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserTypes } from '../domain/user-types.enum';
import { AdminTeamSummaryDto } from './admin-team-summary.dto';

export class UserSummaryResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  stripe_customer_id?: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  email_verified: boolean;

  @ApiPropertyOptional()
  username?: string;

  @ApiPropertyOptional()
  language?: string;

  @ApiPropertyOptional({ type: () => [AdminTeamSummaryDto] })
  adminForTeams?: AdminTeamSummaryDto[];

  @ApiPropertyOptional()
  has_consented_to_terms_of_service?: boolean;

  @ApiPropertyOptional({ enum: UserTypes })
  user_type?: UserTypes;

  @ApiPropertyOptional()
  has_consented_to_privacy_policy?: boolean;
}
