import { Body, Controller, Delete, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { BulckDeleteQueryDto } from '../../focus-mode/dto/bulck-delete-query.dto';
import { Entitlement } from '../../subscription/domain/entitlement.enum';
import {
  HasSubscription,
  RequireEntitlements,
} from '../../subscription/guards/has-subscription/has-subscription.guard';
import { User } from '../../user/entities/user.entity';
import { AcceptInvitationDto } from '../dto/accept-invitation.dto';
import { AddTeamMemberDto } from '../dto/add-team-member.dto';
import { InviteTeamMemberDto } from '../dto/invite-team-member.dto';
import { TeamManagementService } from '../services/team-management/team-management.service';

@Controller('team-management')
@ApiTags('team-management')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class TeamManagementController {
  constructor(private readonly teamManagementService: TeamManagementService) {}

  @Post('/add-member')
  @UseGuards(HasSubscription)
  @RequireEntitlements([Entitlement.team_owner])
  addTeamMember(
    @Body() { member_id }: AddTeamMemberDto,
    @AuthContext() { user: { id: owner_id } }: Passport,
  ): Promise<User> {
    return this.teamManagementService.addTeamMember(member_id, owner_id);
  }

  @Delete('bulk-delete-members')
  @HttpCode(204)
  @UseGuards(HasSubscription)
  @RequireEntitlements([Entitlement.team_owner])
  bulkDeleteTeamMembers(
    @Query() { id }: BulckDeleteQueryDto,
    @AuthContext() { user: { id: owner_id } }: Passport,
  ): Promise<any> {
    const ids = Array.isArray(id) ? id : [id];
    return this.teamManagementService.bulkDeleteTeamMembers(ids, owner_id);
  }

  @Post('/disassociate-self')
  @UseGuards(HasSubscription)
  @RequireEntitlements([Entitlement.team_member])
  disassociateSelf(@AuthContext() { user: { id: member_id } }: Passport): Promise<User> {
    return this.teamManagementService.disassociateSelf(member_id);
  }

  @Post('/invite-member')
  @UseGuards(HasSubscription)
  @RequireEntitlements([Entitlement.team_owner])
  async inviteTeamMember(
    @Body() { email }: InviteTeamMemberDto,
    @AuthContext() { user: { id: owner_id } }: Passport,
  ): Promise<any> {
    return this.teamManagementService.inviteTeamMember(email, owner_id);
  }

  @Post('/accept-invitation')
  async acceptInvitation(
    @Body() { token }: AcceptInvitationDto,
    @AuthContext() { user: { id: user_id } }: Passport,
  ): Promise<any> {
    return this.teamManagementService.acceptInvitation(token, user_id);
  }
}
