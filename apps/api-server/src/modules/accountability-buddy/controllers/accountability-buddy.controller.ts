import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { AccountabilityBuddyService } from '../services/accountability-buddy.service';
import { UnlockRequestService } from '../services/unlock-request.service';
import { InviteBuddyDto } from '../dto/invite-buddy.dto';
import { AcceptInvitationDto } from '../dto/accept-invitation.dto';
import { CreateUnlockRequestDto } from '../dto/create-unlock-request.dto';
import { GetUnlockRequestsQueryDto } from '../dto/get-unlock-requests-query.dto';

@Controller('accountability-buddy')
@ApiTags('accountability-buddy')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class AccountabilityBuddyController {
  constructor(
    private readonly accountabilityBuddyService: AccountabilityBuddyService,
    private readonly unlockRequestService: UnlockRequestService,
  ) {}

  @Post('invite')
  @ApiResponse({ status: 201, description: 'Buddy invitation sent successfully' })
  async inviteBuddy(
    @Body() inviteBuddyDto: InviteBuddyDto,
    @AuthContext() { user: { id: userId } }: Passport,
    @Req() request: Request,
  ) {
    const { origin } = request.headers as { origin?: string };
    return this.accountabilityBuddyService.inviteBuddy(userId, inviteBuddyDto.partner_email, origin);
  }

  @Get()
  @ApiResponse({ status: 200, description: 'List of accountability buddies' })
  async getBuddies(@AuthContext() { user: { id: userId } }: Passport) {
    return this.accountabilityBuddyService.getBuddies(userId);
  }

  @Post('accept-invitation')
  @ApiResponse({ status: 200, description: 'Invitation accepted successfully' })
  async acceptInvitation(
    @Body() acceptInvitationDto: AcceptInvitationDto,
    @AuthContext() { user: { id: buddyUserId } }: Passport,
  ) {
    return this.accountabilityBuddyService.acceptInvitation(acceptInvitationDto.token, buddyUserId);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiResponse({ status: 204, description: 'Buddy removed successfully' })
  async removeBuddy(@Param('id') buddyId: string, @AuthContext() { user: { id: userId } }: Passport) {
    return this.accountabilityBuddyService.removeBuddy(userId, buddyId);
  }

  @Post('unlock-request')
  @ApiResponse({ status: 201, description: 'Unlock request created successfully' })
  async createUnlockRequest(
    @Body() createUnlockRequestDto: CreateUnlockRequestDto,
    @AuthContext() { user: { id: userId } }: Passport,
    @Req() request: Request,
  ) {
    const { origin } = request.headers as { origin?: string };
    return this.unlockRequestService.createUnlockRequest(userId, createUnlockRequestDto, origin);
  }

  @Get('unlock-requests')
  @ApiResponse({ status: 200, description: 'List of unlock requests' })
  async getUnlockRequests(
    @Query() query: GetUnlockRequestsQueryDto,
    @AuthContext() { user: { id: userId } }: Passport,
  ) {
    if (query.approved_only) {
      return this.unlockRequestService.getApprovedUnlockRequests(userId);
    }
    return this.unlockRequestService.getUnlockRequests(userId, query.as_buddy || false);
  }

  @Post('unlock-request/:id/approve')
  @ApiResponse({ status: 200, description: 'Unlock request approved by ID (authenticated user)' })
  async approveUnlockRequestById(
    @Param('id') requestId: string,
    @AuthContext() { user: { id: buddyUserId } }: Passport,
  ) {
    return this.unlockRequestService.approveUnlockRequestById(requestId, buddyUserId);
  }

  @Post('unlock-request/reject')
  @ApiResponse({ status: 200, description: 'Unlock request rejected successfully' })
  async rejectUnlockRequest(
    @Body() { token }: { token: string },
    @AuthContext() { user: { id: buddyUserId } }: Passport,
  ) {
    return this.unlockRequestService.rejectUnlockRequest(token, buddyUserId);
  }

  @Get('unlock-requests/status')
  @ApiResponse({ status: 200, description: 'Status of approved unlock requests for client polling' })
  async getUnlockRequestStatus(@AuthContext() { user: { id: userId } }: Passport) {
    return this.unlockRequestService.getApprovedUnlockRequests(userId);
  }

  @Post('unlock-request/:id/mark-used')
  @ApiResponse({ status: 200, description: 'Unlock request marked as used' })
  async markUnlockRequestAsUsed(@Param('id') requestId: string, @AuthContext() { user: { id: userId } }: Passport) {
    return this.unlockRequestService.markUnlockRequestAsUsed(requestId, userId);
  }
}
