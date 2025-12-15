import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InvitationStatus } from '../domain/invitation-status.enum';

export class GetInvitationsQueryDto {
  @ApiPropertyOptional({
    enum: InvitationStatus,
    description: 'Filter invitations by status',
  })
  @IsOptional()
  @IsEnum(InvitationStatus)
  status?: InvitationStatus;
}
