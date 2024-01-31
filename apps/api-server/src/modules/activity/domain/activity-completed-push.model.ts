import { CreateCompletedActivityDto } from '../dto/create-completed-activity.dto';

export class ActivityCompletedPush {
  constructor(
    completed_activity_id: string,
    { device_id, activity_id, activity_sequence_id }: Partial<CreateCompletedActivityDto>,
  ) {
    this.completed_activity_log_id = completed_activity_id;
    this.leader_device_id = device_id;
    this.activity_id = activity_id;
    this.activity_sequence_id = activity_sequence_id;
  }

  completed_activity_log_id: string;

  leader_device_id: string;

  activity_id: string;

  activity_sequence_id: string;
}
