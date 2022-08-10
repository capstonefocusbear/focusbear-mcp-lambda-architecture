import { ApiProperty } from '@nestjs/swagger';
import { CompletedActivity } from '../entities/completed-activity.entity';

export class CompletedActivityResponse {
  constructor({ completed_activity_log, completed_choice_log }: CompletedActivityResponse) {
    this.completed_activity_log = completed_activity_log;
    this.completed_choice_log = completed_choice_log;
  }

  @ApiProperty()
  completed_activity_log: CompletedActivity;

  @ApiProperty()
  completed_choice_log?: CompletedActivity | null;
}
