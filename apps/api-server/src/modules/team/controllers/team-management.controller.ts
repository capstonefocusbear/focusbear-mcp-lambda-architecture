import { Body, Controller, Delete, Get, HttpCode, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { BulkDeleteQueryDto } from '../../focus-mode/dto/bulck-delete-query.dto';
import { Entitlement } from '../../subscription/domain/entitlement.enum';
import {
  HasSubscription,
  RequireEntitlements,
} from '../../subscription/guards/has-subscription/has-subscription.guard';
import { AcceptInvitationDto } from '../dto/accept-invitation.dto';
import { AddTeamMemberDto } from '../dto/add-team-member.dto';
import { InviteTeamMemberDto } from '../dto/invite-team-member.dto';
import { TeamManagementService } from '../services/team-management/team-management.service';
import { UpdateTeamNameDto } from '../dto/update-team-name.dto';
import { UpdateMemberExpiryDateDto } from '../dto/update-member-expiry-date.dto';
import { AddTeamManuallyDto } from '../dto/add-team-member-manually.dto';
import { HasTeamSubscription } from '../../subscription/guards/has-team-subscription/has-team-subscription.guard';

@Controller('team-management')
@ApiTags('team-management')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class TeamManagementController {
  constructor(private readonly teamManagementService: TeamManagementService) {}

  @Delete('bulk-delete-members')
  @HttpCode(204)
  @UseGuards(HasSubscription)
  @RequireEntitlements([Entitlement.team_owner])
  bulkDeleteTeamMembers(
    @Query() { id, team_id }: BulkDeleteQueryDto,
    @AuthContext() { user: { id: owner_id } }: Passport,
  ): Promise<any> {
    const ids = Array.isArray(id) ? id : [id];
    return this.teamManagementService.bulkDeleteTeamMembers(ids, owner_id, team_id);
  }

  @Post('/remove-member')
  @UseGuards(HasSubscription)
  @RequireEntitlements([Entitlement.team_admin])
  removeMember(
    @Body() { member_id, team_id }: AddTeamMemberDto,
    @AuthContext() { user: { id: adminId } }: Passport,
  ): Promise<void> {
    return this.teamManagementService.removeMember(adminId, member_id, team_id);
  }

  @Post('/invite-member')
  @UseGuards(HasTeamSubscription)
  @RequireEntitlements([Entitlement.team_admin])
  async inviteTeamMember(
    @Body() inviteMemberDto: InviteTeamMemberDto,
    @AuthContext() { user: { id: adminId } }: Passport,
    @Req() request: Request,
  ): Promise<any> {
    const { origin } = request.headers as { origin?: string };
    return this.teamManagementService.inviteTeamMember(adminId, inviteMemberDto, origin);
  }

  @Post('/accept-invitation')
  async acceptInvitation(
    @Body() { token }: AcceptInvitationDto,
    @AuthContext() { user: { id: user_id } }: Passport,
  ): Promise<any> {
    return this.teamManagementService.acceptInvitation(token, user_id);
  }

  @Post('/assign-admin')
  @RequireEntitlements([Entitlement.team_owner])
  async assignAdmin(
    @Body() { member_id, team_id }: AddTeamMemberDto,
    @AuthContext() { user: { id: user_id } }: Passport,
  ): Promise<any> {
    return this.teamManagementService.assignExistingMemberAsAdmin(user_id, member_id, team_id);
  }

  @Post('/remove-admin')
  @RequireEntitlements([Entitlement.team_owner])
  async removeAdmin(
    @Body() { member_id, team_id }: AddTeamMemberDto,
    @AuthContext() { user: { id: user_id } }: Passport,
  ): Promise<any> {
    return this.teamManagementService.removeMemberAsAdmin(user_id, member_id, team_id);
  }

  @Post('/update-team-size')
  @RequireEntitlements([Entitlement.team_owner])
  async updateTeamSize(
    @Body() { team_id, team_size }: { team_id: string; team_size: number },
    @AuthContext() { user: { id: user_id } }: Passport,
  ) {
    return this.teamManagementService.updateTeamSize(user_id, team_id, team_size);
  }

  @Get('/all-members')
  @RequireEntitlements([Entitlement.team_admin])
  async getAllMembers(@Query() { team_id }: { team_id: string }, @AuthContext() { user: { id: adminId } }: Passport) {
    return this.teamManagementService.getAllTeamMembers(adminId, team_id);
  }

  @Put('/name')
  @RequireEntitlements([Entitlement.team_admin])
  async updateTeamName(@Body() { name, team_id }: UpdateTeamNameDto, @AuthContext() { user }: Passport) {
    return this.teamManagementService.updateTeamName(user.id, team_id, name);
  }

  @Get('/admin-teams')
  @RequireEntitlements([Entitlement.team_admin])
  async getAdminUserTeams(@AuthContext() { user }: Passport) {
    return this.teamManagementService.getAdminUserTeams(user.id);
  }

  @Delete()
  @RequireEntitlements([Entitlement.team_owner])
  async deleteTeam(@Query() { team_id }: { team_id: string }, @AuthContext() { user }: Passport) {
    return this.teamManagementService.deleteTeam(user.id, team_id);
  }

  @Put('/member-expiry')
  async updateMemberExpiryDate(
    @Body() updateExpiryDateData: UpdateMemberExpiryDateDto,
    @AuthContext() { user: adminUser }: Passport,
  ) {
    return this.teamManagementService.updateMemberExpiryDate(adminUser.id, updateExpiryDateData);
  }

  @Post('/add-member-manually')
  @UseGuards(HasTeamSubscription)
  @RequireEntitlements([Entitlement.team_admin])
  async addTeamMemberManually(
    @Body() addTeamManuallyDto: AddTeamManuallyDto,
    @AuthContext() { user: { id: adminId } }: Passport,
  ): Promise<any> {
    return this.teamManagementService.addTeamMemberManually(adminId, addTeamManuallyDto);
  }
}
