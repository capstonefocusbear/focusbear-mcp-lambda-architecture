import { FocusModeTag } from '../../apps/api-server/src/modules/focus-mode/entities/focus-mode-tags';
import { ToDo } from '../../apps/api-server/src/modules/to-do/entities/to-do.entity';
import { ProjectManagementPlatforms } from '../../apps/api-server/src/modules/zoho/domain/project-management-platforms.enum';
import { ZohoProject } from '../../apps/api-server/src/modules/zoho/domain/zoho-project.model';

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

export function getZohoProjectsToDelete(zohoProjects: ZohoProject[], syncedZohoProjects: FocusModeTag[]) {
  const zohoProjectsIds = zohoProjects.map((project) => project.id_string);
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

export function createNewTags(projectsToSync: ZohoProject[], userId: string, platform: ProjectManagementPlatforms) {
  return projectsToSync.map(
    (project) =>
      new FocusModeTag({
        user_id: userId,
        text: project.name,
        external_project_id: project.id_string,
        external_project_metadata: { platform, project_data: project },
      }),
  );
}

export function createNewToDos(
  tasksToSync: any[],
  userId: string,
  newTags: FocusModeTag[],
  platform: ProjectManagementPlatforms,
) {
  return tasksToSync.map((task) => {
    const project = getTagForTodo(task, newTags);
    return new ToDo({
      user_id: userId,
      title: task.name,
      details: task.description,
      external_task_id: task.id_string,
      external_task_metadata: { platform, task_data: task },
      tags: [...(project ? [project] : [])],
    });
  });
}
