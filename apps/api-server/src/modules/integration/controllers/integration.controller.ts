import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards, forwardRef, Put } from '@nestjs/common';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { CreateTimeLog } from '../dto/create-time-log.dto';
import { TaskParamsQueryDto } from '../dto/task-params-query.dto';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { IntegrationFactory } from '../services/IntegrationFactory';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { SyncedProjectDto } from '../../to-do/dto/synced-project.dto';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';

@Controller('integration')
export class IntegrationController {
  constructor(
    @Inject(forwardRef(() => IntegrationFactory))
    @Inject(forwardRef(() => PlatformIntegrationsService))
    private readonly integrationFactory: IntegrationFactory,
    private readonly platformIntegrationsService: PlatformIntegrationsService,
  ) {}

  @Get('assignee')
  @UseGuards(IsAuth)
  async getAssigneeStatus(@AuthContext() { user }: Passport) {
    return this.platformIntegrationsService.getAssigneeStatus(user.id);
  }

  @Get(':platform')
  @UseGuards(IsAuth)
  async getPortals(@Param('platform') platform: IntegrationPlatforms, @AuthContext() { user }: Passport) {
    const service = this.integrationFactory.get(platform);
    return service.getPortals(user.id);
  }

  @Get(':platform/projects/all')
  @UseGuards(IsAuth)
  async getAllProjects(@Param('platform') platform: IntegrationPlatforms, @AuthContext() { user }: Passport) {
    const service = this.integrationFactory.get(platform);
    return service.getAllProjects(user.id);
  }

  @Get(':platform/user-projects')
  @UseGuards(IsAuth)
  async getAllUserProjects(
    @Param('platform') platform: IntegrationPlatforms,
    @AuthContext() { user }: Passport,
  ): Promise<SyncedProjectDto[]> {
    const service = this.integrationFactory.get(platform);
    return service.getAllUserProjects(user.id);
  }

  @Post(':platform/sync-project')
  @UseGuards(IsAuth)
  async syncProject(
    @Param('platform') platform: IntegrationPlatforms,
    @Query() { portal_id, project_id }: { portal_id: string; project_id: string },
    @Body() { only_assigned }: { only_assigned: boolean },
    @AuthContext() { user }: Passport,
  ) {
    const service = this.integrationFactory.get(platform);
    return service.syncProjectAndChildTasks(user.id, portal_id, project_id, platform, only_assigned);
  }

  @Post(':platform/sync-tasks')
  @UseGuards(IsAuth)
  async manuallySyncTasks(@Param('platform') platform: IntegrationPlatforms, @AuthContext() { user }: Passport) {
    const service = this.integrationFactory.get(platform);
    return service.manuallySyncTasks(user.id);
  }

  @Get(':platform/:portalId/projects')
  @UseGuards(IsAuth)
  async getProjects(
    @Param('platform') platform: IntegrationPlatforms,
    @Param() { portalId }: TaskParamsQueryDto,
    @AuthContext() { user }: Passport,
  ) {
    const service = this.integrationFactory.get(platform);
    return service.getProjects(user.id, portalId);
  }

  @Get(':platform/:portalId/projects/:projectId/tasks')
  @UseGuards(IsAuth)
  async getTasks(
    @Param('platform') platform: IntegrationPlatforms,
    @Param() { projectId, portalId }: TaskParamsQueryDto,
    @AuthContext() { user }: Passport,
  ) {
    const service = this.integrationFactory.get(platform);
    return service.getTasks(user.id, portalId, projectId);
  }

  @Post(':platform/:portalId/projects/:projectId/tasks/:taskId/logs')
  @UseGuards(IsAuth)
  async addTimeEntry(
    @Param('platform') platform: IntegrationPlatforms,
    @Body() timeEntry: CreateTimeLog,
    @Param() { portalId, projectId, taskId }: TaskParamsQueryDto,
    @AuthContext() { user }: Passport,
  ) {
    const service = this.integrationFactory.get(platform);
    return service.addTimeEntry(user.id, portalId, projectId, taskId, timeEntry);
  }

  @Put(':platform/assignee-filter-status')
  @UseGuards(IsAuth)
  async updateAssigneeFilterStatus(
    @Param('platform') platform: IntegrationPlatforms,
    @Body() { only_assigned }: { only_assigned: boolean },
    @AuthContext() { user }: Passport,
  ) {
    await this.platformIntegrationsService.updateAssigneeStatus(user.id, platform, only_assigned);
  }
}
