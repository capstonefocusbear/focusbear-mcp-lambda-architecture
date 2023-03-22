import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { GetMultipleFocusModeTemplatesQueryDto } from '../dto/get-multiple-focus-mode-templates-query.dto';
import { FocusModeTemplate } from '../entities/focus-mode-template.entity';

@Injectable()
export class FocusModeTemplatesRepository extends BaseRepository<FocusModeTemplate> {
  constructor(private readonly connection: Connection) {
    super(connection, FocusModeTemplate);
  }

  async fetchTemplatesByFilter({
    author_id,
    is_featured,
    marketplace_approval_status,
    language,
    featured_for_onboarding,
  }: GetMultipleFocusModeTemplatesQueryDto): Promise<FocusModeTemplate[]> {
    const query = this.orm.createQueryBuilder('focus_mode_templates');

    if (typeof marketplace_approval_status === 'boolean') {
      query.andWhere('focus_mode_templates.marketplace_approval_status = :marketplace_approval_status', {
        marketplace_approval_status,
      });
    }
    if (typeof is_featured === 'boolean') {
      query.andWhere('focus_mode_templates.is_featured = :is_featured', { is_featured });
    }
    if (typeof featured_for_onboarding === 'boolean') {
      query.andWhere('focus_mode_templates.featured_for_onboarding = :featured_for_onboarding', {
        featured_for_onboarding,
      });
    }
    if (language) {
      query.andWhere('focus_mode_templates.language = :language', { language });
    } else {
      query.andWhere('focus_mode_templates.language = :default_language', { default_language: 'en' });
    }
    if (author_id) {
      query.andWhere('focus_mode_templates.author = :author_id', { author_id });
    }
    const fetchedTemplates = await query.getMany();
    return fetchedTemplates;
  }
}
