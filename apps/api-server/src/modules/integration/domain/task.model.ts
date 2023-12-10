export class Task {
  id: string;

  name: string;

  key: string;

  description: string;

  project_id?: string;

  portal_id?: string;

  status: string;

  external_status?: any;

  external_metadata: any;
}
