import { User } from '../../user/entities/user.entity';
import { CreateCompletedActivityDto } from '../dto/create-completed-activity.dto';
import { CreateSkippedActivityDto } from '../dto/create-skipped-activity.dto';

export class CurrentActivityState {
  constructor(
    { nextActivityId, lastSequenceId, isFirstActivity },
    user: User,
    completedActivity?: CreateCompletedActivityDto | CreateSkippedActivityDto,
  ) {
    this.current_activity_id = nextActivityId || null;
    this.current_activity_sequence_id = nextActivityId ? lastSequenceId : null;
    this.current_activity_assigned_at = nextActivityId ? new Date() : null;
    if (!nextActivityId) {
      this.last_completed_sequence_id = lastSequenceId;
      this.last_completed_sequence_at = new Date();
      this.last_completed_sequence_started_at = user.current_sequence_started_at || new Date();
      this.current_sequence_started_at = null;
    }
    if (isFirstActivity && nextActivityId) {
      this.current_sequence_started_at = completedActivity?.start_time || new Date();
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
