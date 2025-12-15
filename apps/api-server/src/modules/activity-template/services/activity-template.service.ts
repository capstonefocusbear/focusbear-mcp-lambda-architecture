import { Injectable } from '@nestjs/common';
import { InjectSentry, SentryService } from '@app/observability';
import { ActivityTemplateRepository } from '../repository/activity-template.repository';

@Injectable()
export class ActivityTemplateService {
  constructor(
    private readonly activityTemplateRepository: ActivityTemplateRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async bulkDeleteActivityTemplates(pack_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Bulk deleting activity templates',
      });
      await this.activityTemplateRepository.orm.softDelete({ pack_id });
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }
}
