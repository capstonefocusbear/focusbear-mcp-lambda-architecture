import { ApiProperty } from '@nestjs/swagger';
import { FocusModeDaySummaryItem } from '../../focus-mode/domain/focus-mode-day-summary-item.model';
import { ActivityDurationDaySummaryItem } from './activity-duration-day-summary-item.mode';
import { ActivityQuantityDaySummaryItem } from './activity-quantity-day-summary-item.mode';

export class DaySummary {
  @ApiProperty({ isArray: true, type: FocusModeDaySummaryItem })
  focusSummary: FocusModeDaySummaryItem[];

  @ApiProperty({ isArray: true, type: ActivityQuantityDaySummaryItem })
  daySummaryAVG: ActivityQuantityDaySummaryItem[];

  @ApiProperty({ isArray: true, type: ActivityQuantityDaySummaryItem })
  daySummarySUM: ActivityQuantityDaySummaryItem[];

  @ApiProperty({ isArray: true, type: ActivityDurationDaySummaryItem })
  daySummaryDuration: ActivityDurationDaySummaryItem[];
}
