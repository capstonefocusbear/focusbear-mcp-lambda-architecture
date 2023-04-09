import { ApiProperty } from '@nestjs/swagger';
import { CompletedActivity } from '../entities/completed-activity.entity';

export class CompletedActivityResponse {
  constructor({ completed_activity_log, completed_choice_log, saved_log_quantity_answers }: CompletedActivityResponse) {
    this.completed_activity_log = completed_activity_log;
    this.completed_choice_log = completed_choice_log;
    this.saved_log_quantity_answers = saved_log_quantity_answers;
  }

  @ApiProperty()
  completed_activity_log: CompletedActivity;

  @ApiProperty()
  completed_choice_log?: CompletedActivity | null;

  @ApiProperty()
  saved_log_quantity_answers?: any[];
}
