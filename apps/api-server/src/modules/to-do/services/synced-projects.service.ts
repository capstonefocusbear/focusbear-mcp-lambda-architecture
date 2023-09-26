import { Injectable } from '@nestjs/common';
import { SyncedProjectsRepository } from '../repositories/synced-projects.repository';
import { ExternalTaskStatus } from '../domain/external-task-status.model';
import { GetSyncedProjectsQueryDto } from '../dto/get-synced-projects-query.dto';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { ZohoService } from '../../zoho/services/zoho.service';
import { SyncProjectDto } from '../dto/sync-project.dto';

@Injectable()
export class SyncedProjectsService {
  constructor(
    private readonly syncedProjectsRepository: SyncedProjectsRepository,
    private readonly zohoService: ZohoService,
  ) {}

  async mapStatusesToComplete(userId: string, projectId: string, externalStatuses: ExternalTaskStatus[]) {
    const syncedProject = await this.syncedProjectsRepository.orm.findOne({
      where: { user_id: userId, external_project_id: projectId },
    });
    syncedProject.available_statuses = externalStatuses;
    await this.syncedProjectsRepository.orm.save(syncedProject);
  }

  async getUserSyncedProjects(userId: string, { platform }: GetSyncedProjectsQueryDto) {
    if (platform === IntegrationPlatforms.ZOHO) {
      return this.zohoService.getAllUserProjects(userId);
    }
  }

  async syncProject(userId: string, syncProjectData: SyncProjectDto) {
    const { platform, portal_id, project_id } = syncProjectData;
    if (platform === IntegrationPlatforms.ZOHO) {
      return this.zohoService.syncProjectAndChildTasks(userId, portal_id, project_id);
    }
  }
}
