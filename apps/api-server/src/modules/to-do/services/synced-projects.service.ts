/* eslint-disable no-console */
import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { SyncedProjectsRepository } from '../repositories/synced-projects.repository';
import { ExternalTaskStatus } from '../domain/external-task-status.model';
import { GetSyncedProjectsQueryDto } from '../dto/get-synced-projects-query.dto';
import { SyncProjectDto } from '../dto/sync-project.dto';
import { ToDoRepository } from '../repositories/to-do.repository';
import { FocusModeTagRepository } from '../../focus-mode/repositories/focus-mode-tags.repository';
import { IntegrationFactory } from '../../integration/services/IntegrationFactory';

@Injectable()
export class SyncedProjectsService {
  constructor(
    private readonly integrationFactory: IntegrationFactory,
    private readonly syncedProjectsRepository: SyncedProjectsRepository,
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
    const service = this.integrationFactory.get(platform);
    const projects = await service.getAllUserProjects(userId);
    return projects;
  }

  async syncProject(userId: string, syncProjectData: SyncProjectDto) {
    const { platform, portal_id, project_id } = syncProjectData;
    const service = this.integrationFactory.get(platform);
    await service.syncProjectAndChildTasks(userId, portal_id, project_id, platform, true);
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

  async getSyncedProject(externalProjectId: string, userId: string) {
    return this.syncedProjectsRepository.orm.findOneBy({
      external_project_id: externalProjectId,
      user_id: userId,
    });
  }

  async markSyncedProjectTasksAsSynced(syncedProjectRecordId: string) {
    const syncedProject = await this.syncedProjectsRepository.orm.findOneBy({ id: syncedProjectRecordId });

    console.log('Start markSyncedProjectTasksAsSynced - to update have_tasks_been_synced=true');
    console.log(syncedProject);

    syncedProject.have_tasks_been_synced = true;

    syncedProject.synced_at = new Date();

    await this.syncedProjectsRepository.orm.save(syncedProject);
  }
}
