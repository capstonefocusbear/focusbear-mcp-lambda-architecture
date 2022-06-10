import { ApiProperty } from '@nestjs/swagger';
import { CompletedActivityStatItem } from './completed-activity-stat-item.model';
import { CompletedActivityStatType } from './completed-activity-stat-type.enum';
import { LogQuantitySummaryType } from './log-quantity-summary-type.enum';

export class CompletedActivityStats {
  constructor(data: CompletedActivityStats) {
    this.items = data.items;
    this.log_quantity_summary_type = data.log_quantity_summary_type;
    this.stat_type = data.stat_type;
  }

  @ApiProperty()
  items?: CompletedActivityStatItem[];

  @ApiProperty()
  log_quantity_summary_type?: LogQuantitySummaryType | string;

  @ApiProperty()
  stat_type?: CompletedActivityStatType;
}
