import { Controller, Get, Query, UnauthorizedException, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiSecurity, ApiTags, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ServiceAccountContext } from '../../auth/decorators/service-account-context.decorator';
import { ServiceAccountPassport } from '../../auth/domain/service-account-passport.model';
import { ServiceAccountAuth } from '../../auth/guards/service-account-auth/service-account-auth.guard';
import { TeamManagementService } from '../services/team-management/team-management.service';
import { GetAllTeamMembersResponseDto } from '../dto/get-all-team-members.dto';

@Controller('service-account/team-management')
@ApiTags('service-account-team-management')
@UseGuards(ServiceAccountAuth)
@ApiSecurity('Auth0AccessToken')
export class ServiceAccountTeamManagementController {
  constructor(private readonly teamManagementService: TeamManagementService) {}

  @Get('/all-members')
  @ApiQuery({
    name: 'team_id',
    description: 'The UUID of the team to retrieve members for',
    example: 'b9f1bce9-c130-4141-80d6-3bde32a66542',
    required: true,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved all team members',
    type: GetAllTeamMembersResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing service account token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions or team ID mismatch',
  })
  async getAllMembers(
    @Query() { team_id }: { team_id: string },
    @ServiceAccountContext() { serviceAccount }: ServiceAccountPassport,
  ): Promise<GetAllTeamMembersResponseDto> {
    if (!['admin', 'read'].includes(serviceAccount.action)) {
      throw new UnauthorizedException('Insufficient permissions: read access required');
    }

    if (team_id !== serviceAccount.teamId) {
      throw new ForbiddenException('Access denied: team ID mismatch');
    }

    return this.teamManagementService.getAllTeamMemberServiceAcc(team_id);
  }
}
