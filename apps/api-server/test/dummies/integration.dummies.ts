import { FocusModeTag } from '../../src/modules/focus-mode/entities/focus-mode-tags';
import { ToDo } from '../../src/modules/to-do/entities/to-do.entity';
import { userDummy } from '.';

export const taskDummy = {
  id: 'test-id',
  name: 'test-name',
  key: 'test-key',
  description: 'test-description',
};

export const savedTaskDummy = new ToDo({
  user_id: userDummy.id,
  title: taskDummy.name,
  details: taskDummy.description,
  external_task_id: taskDummy.id,
  external_task_metadata: { platform: 'jira', task_data: taskDummy },
});

export const zohoProjectDummy = {
  id: 'test-id',
  id_string: 'test-id',
  name: 'test-name',
  key: 'test-key',
  description: 'test-description',
  portal_id: 'test-portal-id',
};

export const zohoProjectDummyToReturn = {
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

export const mondayTaskDummy = { id: 'task1', name: 'Task 1', group: { id: 'group1' } };

export const asanaTaskDummy = {
  gid: 'test-id',
  name: 'test-name',
  notes: 'test-notes',
  memberships: [
    {
      section: {
        gid: 'section-id',
      },
    },
  ],
};

export const clickUpTaskDummy = {
  id: 'test-id',
  name: 'test-name',
  key: 'test-key',
  description: 'test-description',
  status: { status: 'status1' },
};

export const savedClickUpTaskDummy = new ToDo({
  user_id: userDummy.id,
  title: clickUpTaskDummy.name,
  details: clickUpTaskDummy.description,
  external_task_id: clickUpTaskDummy.id,
  external_task_metadata: { platform: 'clickup', task_data: mondayTaskDummy },
});

export const jiraTaskDummy = {
  id: 'test-id',
  name: 'test-name',
  key: 'test-key',
  description: 'test-description',
};

export const savedJiraTaskDummy = new ToDo({
  user_id: userDummy.id,
  title: jiraTaskDummy.name,
  details: jiraTaskDummy.description,
  external_task_id: jiraTaskDummy.id,
  external_task_metadata: { platform: 'jira', task_data: mondayTaskDummy },
});

export const trelloTaskDummy = {
  id: 'test-id',
  name: 'test-name',
  desc: 'test-description',
};

export const trelloProjectDummy = {
  id: 'test-id',
  name: 'test-name',
  desc: 'test-descriptoin',
};

export const jiraIssueDummy = {
  id: 'task123',
  key: 'key1',
  fields: {
    summary: 'new task 1',
    status: { id: 'status1' },
    description: { type: 'test task' },
  },
};
