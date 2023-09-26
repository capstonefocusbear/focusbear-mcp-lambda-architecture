import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { ZohoService } from '../services/zoho.service';
import { CreateTimeLog } from '../dto/create-time-log.dto';
import { TaskParamsQueryDto } from '../dto/task-params-query.dto';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { SyncedProjectDto } from '../../to-do/dto/synced-project.dto';

@Controller('zoho')
export class ZohoController {
  constructor(private readonly zohoService: ZohoService) {}

  @Get()
  async getPortals(@AuthContext() { user }: Passport) {
    return this.zohoService.getPortals(user.id);
  }

  @Get('projects/all')
  @UseGuards(IsAuth)
  async getAllProjects(@AuthContext() { user }: Passport) {
    return this.zohoService.getAllProjects(user.id);
  }

  @Get('user-projects')
  @UseGuards(IsAuth)
  async getAllUserProjects(@AuthContext() { user }: Passport): Promise<SyncedProjectDto[]> {
    return this.zohoService.getAllUserProjects(user.id);
  }

  @Post('sync-project')
  async syncProject(
    @Query() { portal_id, project_id }: { portal_id: string; project_id: string },
    @AuthContext() { user }: Passport,
  ) {
    return this.zohoService.syncProjectAndChildTasks(user.id, portal_id, project_id);
  }

  @Get(':portalId/projects')
  @UseGuards(IsAuth)
  async getProjects(@Param() { portalId }: TaskParamsQueryDto, @AuthContext() { user }: Passport) {
    return this.zohoService.getProjects(user.id, portalId);
  }

  @Get(':portalId/projects/:projectId/tasks')
  @UseGuards(IsAuth)
  async getTasks(@Param() { portalId, projectId }: TaskParamsQueryDto, @AuthContext() { user }: Passport) {
    return this.zohoService.getTasks(user.id, portalId, projectId);
  }

  @Post(':portalId/projects/:projectId/tasks/:taskId/logs')
  @UseGuards(IsAuth)
  async addTimeEntry(
    @Body() timeEntry: CreateTimeLog,
    @Param() { portalId, projectId, taskId }: TaskParamsQueryDto,
    @AuthContext() { user }: Passport,
  ) {
    return this.zohoService.addTimeEntry(user.id, portalId, projectId, taskId, timeEntry);
  }
}
