import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
// import { Entitlement } from '../../subscription/domain/entitlement.enum';
// import {
// HasSubscription,
// RequireEntitlements,
// } from '../../subscription/guards/has-subscription/has-subscription.guard';
import { User } from '../../user/entities/user.entity';
import { AddTeamMemberDto } from '../dto/add-team-member.dto';
import { TeamManagementService } from '../services/team-management/team-management.service';

@Controller('team-management')
@ApiTags('team-management')
@UseGuards(IsAuth)
// @RequireEntitlements([Entitlement.team_owner_5])
@ApiSecurity('Auth0AccessToken')
export class TeamManagementController {
  constructor(private readonly teamManagementService: TeamManagementService) {}

  @Post()
  addTeamMember(
    @Body() { member_id }: AddTeamMemberDto,
    @AuthContext() { user: { id: owner_id } }: Passport,
  ): Promise<User> {
    return this.teamManagementService.addTeamMember(member_id, owner_id);
  }
}
