import { IntegrationPlatforms } from '../../apps/api-server/src/modules/platform-integrations/domain/integration-platforms.enum';
import { FocusModeTag } from '../../apps/api-server/src/modules/focus-mode/entities/focus-mode-tags';
import { ToDo } from '../../apps/api-server/src/modules/to-do/entities/to-do.entity';
import { Project } from 'apps/api-server/src/modules/integration/domain/project.model';

export function getZohoTasksToDelete(zohoTasks: any[], syncedZohoTasks: ToDo[]) {
  const zohoTasksIds = zohoTasks.map((task) => task.id_string);
  return syncedZohoTasks
    .map((syncedTask) => {
      if (!zohoTasksIds.includes(syncedTask.external_task_id)) {
        return syncedTask.id;
      }
      return null;
    })
    .filter((taskId) => taskId);
}

export function getZohoProjectsToDelete(zohoProjects: Project[], syncedZohoProjects: FocusModeTag[]) {
  const zohoProjectsIds = zohoProjects.map((project) => project.id);
  return syncedZohoProjects
    .map((syncedProject) => {
      if (!zohoProjectsIds.includes(syncedProject.external_project_id)) {
        return syncedProject.id;
      }
      return null;
    })
    .filter((projectId) => projectId);
}

export function getTagForTodo(task: any, tags: FocusModeTag[]): FocusModeTag | null {
  return tags.find((tag) => tag.external_project_id === task?.project?.id_string);
}

export function createNewToDos(
  tasksToSync: any[],
  userId: string,
  tags: FocusModeTag[],
  platform: IntegrationPlatforms,
  externalIdToIdMap: any,
) {
  return tasksToSync.map((task) => {
    const project = getTagForTodo(task, tags);
    return new ToDo({
      user_id: userId,
      title: task.name,
      details: task.description,
      external_task_id: task.id_string,
      external_task_metadata: { platform, task_data: task },
      synced_project_id: externalIdToIdMap[task?.project?.id_string],
      tags: [...(project ? [project] : [])],
    });
  });
}
