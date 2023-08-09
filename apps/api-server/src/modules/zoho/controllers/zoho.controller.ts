import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { ZohoService } from '../services/zoho.service';
import { CreateTaskTimeLog } from '../dto/create-task-timelog.dto';
import { CreateTimeLog } from '../dto/create-time-log.dto';
import { TaskParamsQueryDto } from '../dto/task-params-query.dto';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';

@Controller('portals')
export class ZohoController {
  constructor(private readonly zohoService: ZohoService) {}

  @Get()
  async getPortals(@AuthContext() { user }: Passport) {
    return this.zohoService.getPortals(user.id);
  }

  @Get('projects/all')
  @UseGuards(IsAuth)
  async getAllProjects(@AuthContext() { user }: Passport) {
    const portals: any = await this.zohoService.getPortals(user.id);
    let projectsResponse = [];
    if (!portals.portals) return projectsResponse;
    for (const portal of portals.portals) {
      // eslint-disable-next-line no-await-in-loop
      const projects: any = await this.zohoService.getProjects(user.id, portal.id);
      // eslint-disable-next-line no-continue
      if (!projects.projects) continue;
      projects.projects.forEach((project) => {
        // eslint-disable-next-line no-param-reassign
        project.portal_id = portal.id_string;
      });
      projectsResponse = [...projectsResponse, ...projects.projects];
    }
    return projectsResponse;
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

  @Post(':portalId/projects/:projectId/tasks')
  @UseGuards(IsAuth)
  async addTaskTimeLog(
    @Body() tasks: CreateTaskTimeLog,
    @Param() { portalId, projectId }: TaskParamsQueryDto,
    @AuthContext() { user }: Passport,
  ) {
    return this.zohoService.addTaskTimeLog(user.id, portalId, projectId, tasks);
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
