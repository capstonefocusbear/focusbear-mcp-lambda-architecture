import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { MondayService } from '../services/monday.service';
import { CreateTimeLog } from '../dto/create-time-log.dto';
import { TaskParamsQueryDto } from '../dto/task-params-query.dto';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { UserMondayProject } from '../dto/user-monday-project.dto';

@Controller('monday')
export class MondayController {
  constructor(private readonly mondayService: MondayService) {}

  
  @Get()
  async getPortals(@AuthContext() { user }: Passport) {
    return this.mondayService.getPortals(user.id);
  }

  @Get('projects/all')
  @UseGuards(IsAuth)
  async getAllProjects(@AuthContext() { user }: Passport) {
    return this.mondayService.getAllProjects(user.id);
  }

  @Get('user-projects')
  @UseGuards(IsAuth)
  async getAllUserProjects(@AuthContext() { user }: Passport): Promise<UserMondayProject[]> {
    return this.mondayService.getAllUserProjects(user.id);
  }

  @Post('sync-project')
  async syncProject(
    @Query() { portal_id, project_id }: { portal_id: string; project_id: string },
    @AuthContext() { user }: Passport,
  ) {
    return this.mondayService.syncProjectAndChildTasks(user.id, portal_id, project_id);
  }

  @Get(':portalId/projects')
  @UseGuards(IsAuth)
  async getProjects(@Param() { portalId }: TaskParamsQueryDto, @AuthContext() { user }: Passport) {
    return this.mondayService.getProjects(user.id, portalId);
  }

  @Get(':portalId/projects/:projectId/tasks')
  @UseGuards(IsAuth)
  async getTasks(@Param() { projectId }: TaskParamsQueryDto, @AuthContext() { user }: Passport) {
    return this.mondayService.getTasks(user.id, projectId);
  }

  @Post(':portalId/projects/:projectId/tasks/:taskId/logs')
  @UseGuards(IsAuth)
  async addTimeEntry(
    @Body() timeEntry: CreateTimeLog,
    @Param() { portalId, projectId, taskId }: TaskParamsQueryDto,
    @AuthContext() { user }: Passport,
  ) {
    return this.mondayService.addTimeEntry(user.id, portalId, projectId, taskId, timeEntry);
  }
}
