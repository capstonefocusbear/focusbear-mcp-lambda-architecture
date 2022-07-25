import { ApiProperty } from '@nestjs/swagger';
import { CompletedActivityStatItem } from './completed-activity-stat-item.model';
import { CompletedActivityStatType } from './completed-activity-stat-type.enum';
import { LogSummaryType } from './log-summary-type.enum';

export class CompletedActivityStats {
  constructor(data: CompletedActivityStats) {
    this.activity_id = data.activity_id;
    this.days_number = data.days_number;
    this.timezone = data.timezone;
    this.log_summary_type = data.log_summary_type;
    this.stat_type = data.stat_type;
    this.items = data.items;
  }

  @ApiProperty()
  activity_id?: string;

  @ApiProperty()
  timezone?: string;

  @ApiProperty()
  days_number?: number;

  @ApiProperty()
  log_summary_type?: LogSummaryType | string;

  @ApiProperty()
  stat_type?: CompletedActivityStatType;

  @ApiProperty()
  items?: CompletedActivityStatItem[];
}
