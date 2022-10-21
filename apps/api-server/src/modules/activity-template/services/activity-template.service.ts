import { Injectable } from '@nestjs/common';
import { ActivityTemplateRepository } from '../repository/activity-template.repository';

@Injectable()
export class ActivityTemplateService {
  constructor(private readonly activityTemplateRepository: ActivityTemplateRepository) {}

  async bulkDeleteActivityTemplates(pack_id: string) {
    await this.activityTemplateRepository.orm.softDelete({ pack_id });
  }
}
