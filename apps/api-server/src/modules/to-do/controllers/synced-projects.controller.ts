import { Body, Controller, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { MapExternalStatusToCompleteDto } from '../dto/map-external-status-to-complete.dto';
import { SyncedProjectsService } from '../services/synced-projects.service';
import { GetSyncedProjectsQueryDto } from '../dto/get-synced-projects-query.dto';
import { SyncedProjectDto } from '../dto/synced-project.dto';
import { SyncProjectDto } from '../dto/sync-project.dto';

@Controller('synced-projects')
@ApiTags('synced-projects')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class SyncedProjectsController {
  constructor(private readonly syncedProjectsService: SyncedProjectsService) {}

  @Put('/external-statuses')
  async mapExternalStatusesToComplete(
    @Body() { project_id, external_statuses }: MapExternalStatusToCompleteDto,
    @AuthContext() { user }: Passport,
  ) {
    return this.syncedProjectsService.mapStatusesToComplete(user.id, project_id, external_statuses);
  }

  @Get()
  async getUserSyncedProjectsByPlatform(
    @Query() { platform }: GetSyncedProjectsQueryDto,
    @AuthContext() { user }: Passport,
  ): Promise<SyncedProjectDto[]> {
    return this.syncedProjectsService.getUserSyncedProjects(user.id, { platform });
  }

  @Post()
  async syncProject(@Body() syncProjectData: SyncProjectDto, @AuthContext() { user }: Passport) {
    return this.syncedProjectsService.syncProject(user.id, syncProjectData);
  }
}
