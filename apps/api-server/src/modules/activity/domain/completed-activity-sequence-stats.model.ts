import { ApiProperty } from '@nestjs/swagger';
import { CompletedActivityStatItem } from './completed-activity-stat-item.model';

export class CompletedActivitySequenceStats {
  constructor(data: CompletedActivitySequenceStats) {
    this.activity_sequence_id = data.activity_sequence_id;
    this.days_number = data.days_number;
    this.daily_durations_minutes = data.daily_durations_minutes;
    this.average_completion_percent = data.average_completion_percent;
    this.timezone = data.timezone;
  }

  @ApiProperty()
  activity_sequence_id: string;

  @ApiProperty()
  days_number: number;

  @ApiProperty()
  timezone?: string;

  @ApiProperty()
  daily_durations_minutes: CompletedActivityStatItem[];

  @ApiProperty()
  average_completion_percent: number | string;
}
