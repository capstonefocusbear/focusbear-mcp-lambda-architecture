import { CompletedActivityStatItem } from './completed-activity-stat-item.model';
import { CompletedActivityStatType } from './completed-activity-stat-type.enum';
import { LogQuantitySummaryType } from './log-quantity-summary-type.enum';

export class CompletedActivityStats {
  items?: CompletedActivityStatItem[];

  log_quantity_summary_type?: LogQuantitySummaryType;

  stat_type?: CompletedActivityStatType;
}
