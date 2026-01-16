import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { ProjectService } from '../services/project.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { UpdateProjectParamsDto } from '../dto/update-project-params.dto';
import { InviteProjectMemberDto } from '../dto/invite-project-member.dto';
import { InviteProjectMemberParamsDto } from '../dto/invite-project-member-params.dto';
import { UpdateProjectMemberDto } from '../dto/update-project-member.dto';
import { UpdateProjectMemberParamsDto } from '../dto/update-project-member-params.dto';
import { GetProjectParamsDto } from '../dto/get-project-params.dto';
import { RemoveProjectMemberParamsDto } from '../dto/remove-project-member-params.dto';
import { AcceptInvitationParamsDto } from '../dto/accept-invitation-params.dto';
import { ProjectResponseDto } from '../dto/project-response.dto';
import { ProjectListResponseDto } from '../dto/project-list-response.dto';
import { ProjectMemberResponseDto } from '../dto/project-member-response.dto';

@Controller('projects')
@ApiTags('projects')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  async createProject(@Body() dto: CreateProjectDto, @AuthContext() { user }: Passport): Promise<ProjectResponseDto> {
    return this.projectService.createProject(user.id, dto);
  }

  @Get()
  async getUserProjects(@AuthContext() { user }: Passport): Promise<ProjectListResponseDto> {
    return this.projectService.getUserProjects(user.id);
  }

  @Get('invitations/pending')
  async getPendingInvitations(@AuthContext() { user }: Passport): Promise<ProjectResponseDto[]> {
    return this.projectService.getPendingInvitations(user.id);
  }

  @Get(':project_id')
  async getProjectById(
    @Param() params: GetProjectParamsDto,
    @AuthContext() { user }: Passport,
  ): Promise<ProjectResponseDto> {
    return this.projectService.getProjectById(user.id, params.project_id);
  }

  @Put(':project_id')
  async updateProject(
    @Param() params: UpdateProjectParamsDto,
    @Body() dto: UpdateProjectDto,
    @AuthContext() { user }: Passport,
  ): Promise<ProjectResponseDto> {
    return this.projectService.updateProject(user.id, params.project_id, dto);
  }

  @Delete(':project_id')
  async deleteProject(@Param() params: GetProjectParamsDto, @AuthContext() { user }: Passport): Promise<void> {
    return this.projectService.deleteProject(user.id, params.project_id);
  }

  @Post(':project_id/members')
  async inviteMember(
    @Param() params: InviteProjectMemberParamsDto,
    @Body() dto: InviteProjectMemberDto,
    @AuthContext() { user }: Passport,
  ): Promise<ProjectMemberResponseDto> {
    return this.projectService.inviteMember(user.id, params.project_id, dto);
  }

  @Delete(':project_id/members/:member_id')
  async removeMember(@Param() params: RemoveProjectMemberParamsDto, @AuthContext() { user }: Passport): Promise<void> {
    return this.projectService.removeMember(user.id, params.project_id, params.member_id);
  }

  @Put(':project_id/members/:member_id')
  async updateMemberRole(
    @Param() params: UpdateProjectMemberParamsDto,
    @Body() dto: UpdateProjectMemberDto,
    @AuthContext() { user }: Passport,
  ): Promise<ProjectMemberResponseDto> {
    return this.projectService.updateMemberRole(user.id, params.project_id, params.member_id, dto);
  }

  @Post(':project_id/members/accept')
  async acceptInvitation(
    @Param() params: AcceptInvitationParamsDto,
    @AuthContext() { user }: Passport,
  ): Promise<ProjectMemberResponseDto> {
    return this.projectService.acceptInvitation(user.id, params.project_id);
  }

  @Post(':project_id/members/decline')
  async declineInvitation(
    @Param() params: AcceptInvitationParamsDto,
    @AuthContext() { user }: Passport,
  ): Promise<void> {
    return this.projectService.declineInvitation(user.id, params.project_id);
  }
}
