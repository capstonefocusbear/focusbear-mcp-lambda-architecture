export interface ProjectStatus {
  id: string;
  label: string;
  color: string;
  order: number;
  should_complete_task: boolean;
}

export const DEFAULT_PROJECT_STATUSES: ProjectStatus[] = [
  { id: 'default-todo', label: 'To Do', color: '#6B7280', order: 0, should_complete_task: false },
  { id: 'default-in-progress', label: 'In Progress', color: '#3B82F6', order: 1, should_complete_task: false },
  { id: 'default-done', label: 'Done', color: '#10B981', order: 2, should_complete_task: true },
];
