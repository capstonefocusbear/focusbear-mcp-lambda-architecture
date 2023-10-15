import { IntegrationPlatforms } from '../apps/api-server/src/modules/platform-integrations/domain/integration-platforms.enum';
import { FocusModeTag } from '../apps/api-server/src/modules/focus-mode/entities/focus-mode-tags';
import { Project } from 'apps/api-server/src/modules/integration/domain/project.model';

export function createNewTags(projectsToSync: Project[], userId: string, platform: IntegrationPlatforms) {
  return projectsToSync.map(
    (project) =>
      new FocusModeTag({
        user_id: userId,
        text: project.name,
        external_project_id: project.id,
        external_project_metadata: { platform, project_data: project },
      }),
  );
}
