import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { ToDoRepository } from '../../to-do/repositories/to-do.repository';
import { FocusModeTag } from '../../focus-mode/entities/focus-mode-tags';
import { ToDo } from '../../to-do/entities/to-do.entity';
import { SyncedProjectsService } from '../../to-do/services/synced-projects.service';
import { IntegrationFactory } from '../services/IntegrationFactory';

@Processor('sync-tasks')
export class SyncTasksConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly toDoRepository: ToDoRepository,
    private readonly syncedProjectsService: SyncedProjectsService,
    private readonly integrationFactory: IntegrationFactory,
  ) {}

  @Process('sync-project-tasks')
  async readOperationJob(
    job: Job<{
      userId: string;
      portalId: string;
      projectId: string;
      projectAsFocusModeTag: FocusModeTag;
      platform: IntegrationPlatforms;
    }>,
  ) {
    const {
      data: { userId, portalId, projectId, projectAsFocusModeTag, platform },
    } = job;
    try {
      const service = this.integrationFactory.get(platform);
      const tasksFromProject = await service.getTasksOwnedByUser(userId, portalId, projectId);
      const syncedProjectRecord = await this.syncedProjectsService.getSyncedProject(projectId);
      const tasksAsToDos = tasksFromProject.map((task) => {
        return new ToDo({
          user_id: userId,
          title: task.name,
          details: task.description,
          external_task_id: task.id,
          external_task_metadata: { platform, task_data: task.external_metadata },
          synced_project_id: syncedProjectRecord.id,
          tags: [...(projectAsFocusModeTag ? [projectAsFocusModeTag] : [])],
        });
      });
      await Promise.all([
        this.toDoRepository.orm.save(tasksAsToDos),
        this.syncedProjectsService.markSyncedProjectTasksAsSynced(syncedProjectRecord.id),
      ]);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      console.error('Error in sync-project-tasks queued job: ', JSON.stringify(error));
    }
  }
}
