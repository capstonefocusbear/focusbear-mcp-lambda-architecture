import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../user/entities/user.entity';
import { ActivitySequence } from '../entities/activity-sequence.entity';
import { Activity } from '../entities/activity.entity';

export class CurrentActivityProps {
  constructor(data?: User) {
    this.current_activity_sequence = data?.current_activity_sequence || null;
    this.current_activity = data?.current_activity || null;
    this.current_activity_assigned_at = data?.current_activity_assigned_at || null;
    this.last_completed_sequence = data?.last_completed_sequence || null;
    this.last_completed_sequence_at = data?.last_completed_sequence_at || null;
  }

  @ApiProperty()
  current_activity_sequence?: ActivitySequence | null;

  @ApiProperty()
  current_activity?: Activity | null;

  @ApiProperty()
  current_activity_assigned_at?: Date | null;

  @ApiProperty()
  last_completed_sequence?: ActivitySequence | null;

  @ApiProperty()
  last_completed_sequence_at?: Date | null;
}
