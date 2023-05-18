import { Injectable } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { CompletedFocusBlockRepository } from '../../repositories/completed-focus-block.repository';
import { CompletedFocusBlock } from '../../entities/completed-focus-block.entity';
import { FocusModeDaySummaryItem } from '../../domain/focus-mode-day-summary-item.model';
import { GetFocusStatsQueryDto } from '../../dto/get-focus-stats-query.dto';

@Injectable()
export class CompletedFocusBlockService {
  constructor(
    private readonly completedFocusBlockRepository: CompletedFocusBlockRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async getFocusBlockStats(user_id: string, getFocusStatsQuery: GetFocusStatsQueryDto) {
    const completedFocusBlocks = await this.completedFocusBlockRepository.getFocusBlockLogsForTimeRange(
      user_id,
      getFocusStatsQuery,
    );
    return this.countFocusModeSummary(completedFocusBlocks);
  }

  countFocusModeSummary(items: CompletedFocusBlock[]): FocusModeDaySummaryItem[] {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Counting focus mode summary',
    });
    return items.map(({ focus_mode, start_time, finish_time, achievements = '', distractions = '', tags }) => ({
      name: focus_mode.name,
      start_time,
      duration: (new Date(finish_time).getTime() - new Date(start_time).getTime()) / 1000,
      achievements,
      distractions,
      tags: tags?.map((tag) => tag.text),
    }));
  }
}
