import { ExternalTaskStatus } from '../domain/external-task-status.model';

export class SyncedProjectDto {
  name: string;

  project_id: string;

  portal_id: string;

  is_synced: boolean;

  external_statuses: ExternalTaskStatus[];

  synced_at?: string | null;
}
