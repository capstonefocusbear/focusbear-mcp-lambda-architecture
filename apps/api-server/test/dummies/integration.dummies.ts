import { FocusModeTag } from '../../src/modules/focus-mode/entities/focus-mode-tags';
import { Project } from '../../src/modules/integration/domain/project.model';
import { ToDo } from '../../src/modules/to-do/entities/to-do.entity';
import { userDummy } from '.';

export const zohoProjectDummy: Project = {
  id: 'test-id',
  name: 'test-name',
  key: 'test-key',
  description: 'test-description',
  portal_id: 'test-portal-id',
};

export const zohoTaskDummy = {
  id_string: 'test-id',
  name: 'test-name',
  key: 'test-key',
  description: 'test-description',
};

export const savedZohoProjectDummy = new FocusModeTag({
  user_id: userDummy.id,
  text: 'some name',
  external_project_id: zohoProjectDummy.id,
  external_project_metadata: { platform: 'zoho', project_data: zohoProjectDummy },
});

export const savedZohoTaskDummy = new ToDo({
  user_id: userDummy.id,
  title: zohoTaskDummy.name,
  details: zohoTaskDummy.description,
  external_task_id: zohoTaskDummy.id_string,
  external_task_metadata: { platform: 'zoho', task_data: zohoTaskDummy },
});

export const mondayTaskDummy = {
  id: 'test-id',
  name: 'test-name',
  key: 'test-key',
  description: 'test-description',
};

export const savedMondayTaskDummy = new ToDo({
  user_id: userDummy.id,
  title: mondayTaskDummy.name,
  details: mondayTaskDummy.description,
  external_task_id: mondayTaskDummy.id,
  external_task_metadata: { platform: 'monday', task_data: mondayTaskDummy },
});
