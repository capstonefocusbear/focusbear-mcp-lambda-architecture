import { ToDo } from '../entities/to-do.entity';

export class ToDoResponse extends ToDo {
  current_external_status?: any;

  external_statuses?: any;
}
