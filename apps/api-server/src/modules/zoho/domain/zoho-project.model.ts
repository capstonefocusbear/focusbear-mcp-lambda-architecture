import { ZohoTaskStatus } from './zoho-task-status.model';

export class ZohoProject {
  id_string: string;

  name: string;

  key: string;

  description: string;

  portal_id?: string;

  available_statuses?: ZohoTaskStatus[];
}
