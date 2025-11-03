import { Injectable, Logger } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { DEFAULT_EMBEDDING_MODEL } from '@app/openai/openai.constants';
import { ActivityTemplateRepository } from '../repository/activity-template.repository';
import { ActivityTemplateGoalEmbeddingService } from './activity-template-goal-embedding.service';
import { ActivityTemplateEmbeddingRepository } from '../repository/activity-template-embedding.repository';
import { ActivityTemplate } from '../entity/activity-template.entity';
import { ActivityTemplateEmbedding } from '../entity/activity-template-embedding.entity';

export interface EmbeddingSyncSummary {
  processed: number;
  upserted: number;
  skipped: number;
  errors: number;
}

@Injectable()
export class ActivityTemplateEmbeddingSyncService {
  private readonly logger = new Logger(ActivityTemplateEmbeddingSyncService.name);

  constructor(
    private readonly activityTemplateRepository: ActivityTemplateRepository,
    private readonly goalEmbeddingService: ActivityTemplateGoalEmbeddingService,
    private readonly activityTemplateEmbeddingRepository: ActivityTemplateEmbeddingRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async syncAll(): Promise<EmbeddingSyncSummary> {
    const templates = await this.activityTemplateRepository.getTemplatesForEmbeddingSync();

    const results = await Promise.all(
      templates.map(async (template) => {
        try {
          const textSource = this.buildTextSource(template);
          const activityName = template.activity_data?.name?.trim() || '';
          const embedding = await this.goalEmbeddingService.generateEmbedding(activityName);

          if (!embedding.length) {
            return 'skipped' as const;
          }

          await this.activityTemplateEmbeddingRepository.upsert(
            new ActivityTemplateEmbedding(
              {
                activity_template_id: template.id,
                embedding,
                text_source: textSource,
                metadata: this.buildMetadata(template),
                model_version: DEFAULT_EMBEDDING_MODEL,
              },
              { generateId: true },
            ),
            ['activity_template_id'],
          );

          return 'upserted' as const;
        } catch (error) {
          this.logger.error(`Failed to sync embedding for template ${template.id}`, error.stack);
          this.sentryService.instance().captureException(error, {
            level: 'error',
            extra: { templateId: template.id },
          });
          return 'error' as const;
        }
      }),
    );

    const summary = results.reduce<EmbeddingSyncSummary>(
      (acc, result) => {
        if (result === 'upserted') {
          acc.upserted += 1;
        } else if (result === 'skipped') {
          acc.skipped += 1;
        } else if (result === 'error') {
          acc.errors += 1;
        }
        return acc;
      },
      {
        processed: templates.length,
        upserted: 0,
        skipped: 0,
        errors: 0,
      },
    );

    return summary;
  }

  private buildTextSource(template: ActivityTemplate): string {
    const tagList = this.getTags(template).join(', ');
    const parts = [
      template.activity_data?.name,
      template.activity_data?.text_instructions,
      tagList ? `Tags: ${tagList}` : null,
      template.activity_type ? `Routine: ${template.activity_type}` : null,
    ].filter(Boolean);

    return parts.join('\n');
  }

  private buildMetadata(template: ActivityTemplate): Record<string, unknown> {
    return {
      tags: this.getTags(template),
      activityType: template.activity_type,
    };
  }

  private getTags(template: ActivityTemplate): string[] {
    return (template.tags ?? []).flatMap((tag) => tag.tags ?? []);
  }
}
