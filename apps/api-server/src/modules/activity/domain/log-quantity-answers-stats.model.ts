import { ApiProperty } from '@nestjs/swagger';
import { CompletedActivityStatItem } from './completed-activity-stat-item.model';
import { LogSummaryType } from './log-summary-type.enum';
import { LogQuantityQuestion } from '../entities/log-quantity-questions';

export class LogQuantityAnswersStats {
  constructor(data: LogQuantityAnswersStats) {
    this.question_id = data.question_id;
    this.days_number = data.days_number;
    this.timezone = data.timezone;
    this.log_summary_type = data.log_summary_type;
    this.question = data.question;
    this.items = data.items;
  }

  @ApiProperty()
  question?: LogQuantityQuestion;

  @ApiProperty()
  question_id?: string;

  @ApiProperty()
  timezone?: string;

  @ApiProperty()
  days_number?: number;

  @ApiProperty()
  log_summary_type?: LogSummaryType | string;

  @ApiProperty()
  items?: CompletedActivityStatItem[];
}
