import { ApiProperty } from '@nestjs/swagger';
import { FocusModeDaySummaryItem } from '../../focus-mode/domain/focus-mode-day-summary-item.model';
import { ActivityDurationDaySummaryItem } from './activity-duration-day-summary-item.mode';
import { ActivityQuantityDaySummaryItem } from './activity-quantity-day-summary-item.mode';

export class DaySummary {
  @ApiProperty()
  focusSummary: FocusModeDaySummaryItem[];

  @ApiProperty()
  daySummaryAVG: ActivityQuantityDaySummaryItem[];

  @ApiProperty()
  daySummarySUM: ActivityQuantityDaySummaryItem[];

  @ApiProperty()
  daySummaryDuration: ActivityDurationDaySummaryItem[];
}
