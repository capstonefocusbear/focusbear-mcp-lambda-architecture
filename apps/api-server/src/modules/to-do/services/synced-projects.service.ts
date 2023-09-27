import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { SyncedProjectsRepository } from '../repositories/synced-projects.repository';
import { ExternalTaskStatus } from '../domain/external-task-status.model';
import { GetSyncedProjectsQueryDto } from '../dto/get-synced-projects-query.dto';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { ZohoService } from '../../zoho/services/zoho.service';
import { SyncProjectDto } from '../dto/sync-project.dto';
import { ToDoRepository } from '../repositories/to-do.repository';
import { FocusModeTagRepository } from '../../focus-mode/repositories/focus-mode-tags.repository';

@Injectable()
export class SyncedProjectsService {
  constructor(
    private readonly syncedProjectsRepository: SyncedProjectsRepository,
    private readonly zohoService: ZohoService,
    private readonly toDoRepository: ToDoRepository,
    private readonly focusModeTagRepository: FocusModeTagRepository,
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

  async unSyncProject(userId: string, projectId: string) {
    const syncedProject = await this.syncedProjectsRepository.orm.findOne({
      where: { user_id: userId, external_project_id: projectId },
    });
    const linkedToDos = await this.toDoRepository.orm.find({
      where: { user_id: userId, synced_project_id: syncedProject.id },
    });
    const toDoIds = linkedToDos?.map(({ id }) => id);
    await Promise.all([
      this.toDoRepository.orm.delete({ id: In(toDoIds) }),
      this.focusModeTagRepository.orm.delete({ external_project_id: projectId }),
      this.syncedProjectsRepository.orm.delete({ external_project_id: projectId }),
    ]);
  }
}
