import { ApiProperty } from '@nestjs/swagger';
import { FocusMode } from '../../focus-mode/entities/focus-mode.entity';
import { User } from '../../user/entities/user.entity';
import { ActivitySequence } from '../entities/activity-sequence.entity';
import { Activity } from '../entities/activity.entity';
import { CompletedFocusBlock } from '../../focus-mode/entities/completed-focus-block.entity';

interface ExtendedActivityProps {
  current_sequence_completed_activities?: string[];
  today_completed_activity_sequence_ids: string[];
}

export class CurrentActivityProps {
  constructor(data?: User & ExtendedActivityProps) {
    this.current_activity_sequence = data?.current_activity_sequence || null;
    this.last_completed_sequence_started_at = data?.last_completed_sequence_started_at || null;
    this.current_activity = data?.current_activity || null;
    this.current_activity_assigned_at = data?.current_activity_assigned_at || null;
    this.last_completed_sequence = data?.last_completed_sequence || null;
    this.last_completed_sequence_at = data?.last_completed_sequence_at || null;
    this.current_focus_mode_finish_time = data?.current_focus_mode_finish_time || null;
    this.current_focus_mode = data?.current_focus_mode || null;
    this.current_sequence_skipped_activities = data?.current_sequence_skipped_activities || null;
    this.last_time_user_settings_modified = data?.last_time_user_settings_modified || null;
    this.current_sequence_completed_activities = data?.current_sequence_completed_activities;
    this.completing_focus_block = data?.completing_focus_block;
    this.today_completed_activity_sequence_ids = data.today_completed_activity_sequence_ids;
  }

  @ApiProperty()
  current_activity_sequence?: ActivitySequence | null;

  @ApiProperty()
  last_completed_sequence_started_at?: Date | null;

  @ApiProperty()
  current_activity?: Activity | null;

  @ApiProperty()
  current_activity_assigned_at?: Date | null;

  @ApiProperty()
  last_completed_sequence?: ActivitySequence | null;

  @ApiProperty()
  last_completed_sequence_at?: Date | null;

  @ApiProperty()
  current_focus_mode?: FocusMode | null;

  @ApiProperty()
  current_focus_mode_finish_time?: Date | null;

  @ApiProperty()
  current_sequence_skipped_activities?: string[];

  @ApiProperty()
  last_time_user_settings_modified?: Date;

  @ApiProperty()
  current_sequence_completed_activities?: string[];

  @ApiProperty()
  completing_focus_block?: CompletedFocusBlock;

  @ApiProperty()
  today_completed_activity_sequence_ids: string[];
}
