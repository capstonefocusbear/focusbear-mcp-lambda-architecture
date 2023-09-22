import { Injectable } from '@nestjs/common';
import { SyncedProjectsRepository } from '../repositories/synced-projects.repository';
import { ExternalTaskStatus } from '../domain/external-task-status.model';

@Injectable()
export class SyncedProjectsService {
  constructor(private readonly syncedProjectsRepository: SyncedProjectsRepository) {}

  async mapStatusesToComplete(userId: string, projectId: string, externalStatuses: ExternalTaskStatus[]) {
    const syncedProject = await this.syncedProjectsRepository.orm.findOne({
      where: { user_id: userId, external_project_id: projectId },
    });
    syncedProject.available_statuses = externalStatuses;
    await this.syncedProjectsRepository.orm.save(syncedProject);
  }
}
