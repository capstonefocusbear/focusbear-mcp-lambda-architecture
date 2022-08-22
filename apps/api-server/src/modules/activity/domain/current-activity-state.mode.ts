export class CurrentActivityState {
  constructor({ nextActivity, lastSequenceId }) {
    this.current_activity_id = nextActivity || null;
    this.current_activity_sequence_id = nextActivity ? lastSequenceId : null;
    this.current_activity_assigned_at = nextActivity ? new Date() : null;
    if (!nextActivity) {
      this.last_completed_sequence_id = lastSequenceId;
      this.last_completed_sequence_at = new Date();
    }
  }

  current_activity_sequence_id: string | null;

  current_activity_id: string | null;

  current_activity_assigned_at: Date | null;

  last_completed_sequence_id?: string;

  last_completed_sequence_at?: Date;
}
