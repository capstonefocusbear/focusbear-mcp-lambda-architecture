import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards, forwardRef } from '@nestjs/common';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { CreateTimeLog } from '../dto/create-time-log.dto';
import { TaskParamsQueryDto } from '../dto/task-params-query.dto';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { IntegrationFactory } from '../services/IntegrationFactory';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { SyncedProjectDto } from '../../to-do/dto/synced-project.dto';

@Controller('integration')
export class IntegrationController {
  constructor(
    @Inject(forwardRef(() => IntegrationFactory))
    private readonly integrationFactory: IntegrationFactory,
  ) {}

  @Get(':platform')
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
  async syncProject(
    @Param('platform') platform: IntegrationPlatforms,
    @Query() { portal_id, project_id }: { portal_id: string; project_id: string },
    @AuthContext() { user }: Passport,
  ) {
    const service = this.integrationFactory.get(platform);
    return service.syncProjectAndChildTasks(user.id, portal_id, project_id);
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
    return service.getTasks(user.id, projectId, portalId);
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
}
