import { User } from '../../user/entities/user.entity';
import { CreateCompletedActivityDto } from '../dto/create-completed-activity.dto';

export class CurrentActivityState {
  constructor(
    { nextActivity, lastSequenceId, currentActivityIndex },
    user: User,
    completedActivity?: CreateCompletedActivityDto,
  ) {
    this.current_activity_id = nextActivity || null;
    this.current_activity_sequence_id = nextActivity ? lastSequenceId : null;
    this.current_activity_assigned_at = nextActivity ? new Date() : null;
    if (!nextActivity) {
      this.last_completed_sequence_id = lastSequenceId;
      this.last_completed_sequence_at = new Date();
      this.last_completed_sequence_started_at = user.current_sequence_started_at;
      this.current_sequence_started_at = null;
    }
    if (currentActivityIndex === 0) {
      this.current_sequence_started_at = completedActivity ? completedActivity.start_time : new Date();
    }
  }

  current_activity_sequence_id: string | null;

  current_activity_id: string | null;

  current_activity_assigned_at: Date | null;

  last_completed_sequence_id?: string;

  last_completed_sequence_at?: Date;

  last_completed_sequence_started_at?: Date;

  current_sequence_started_at?: Date;
}
