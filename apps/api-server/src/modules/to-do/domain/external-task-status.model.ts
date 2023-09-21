export class ExternalTaskStatus {
  constructor({ label, status_id, should_complete_task }: ExternalTaskStatus) {
    this.label = label;
    this.status_id = status_id;
    this.should_complete_task = should_complete_task;
  }

  label: string;

  status_id: string;

  should_complete_task: boolean;
}
