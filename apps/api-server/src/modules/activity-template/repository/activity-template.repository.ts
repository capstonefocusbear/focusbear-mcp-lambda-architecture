import { Injectable } from '@nestjs/common';
import { Connection, In, Not } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { ActivityTemplate } from '../entity/activity-template.entity';
import { AppDataSource } from '../../../../ormconfig';
import { ActivityType } from '../../activity/domain/activity-type.enum';
import { LogQuantityQuestion } from '../../activity/entities/log-quantity-questions';

@Injectable()
export class ActivityTemplateRepository extends BaseRepository<ActivityTemplate> {
  constructor(private readonly connection: Connection) {
    super(connection, ActivityTemplate);
  }

  async getActivityTemplateIds(pack_id: string) {
    const activityIdObjects = await this.orm
      .createQueryBuilder('activity_templates')
      .select(['activity_templates.id'])
      .where('activity_templates.pack_id = :pack_id', { pack_id })
      .withDeleted()
      .getMany();

    return activityIdObjects.map((idObject) => idObject.id);
  }

  async consistentlyUpdateLibraryActivities(
    activityTemplateIds: string[],
    activityTemplates: ActivityTemplate[],
    user_id: string,
    logQuantityQuestions: LogQuantityQuestion[],
  ) {
    await AppDataSource.manager.transaction('SERIALIZABLE', async (transactionalEntityManager) => {
      await transactionalEntityManager.delete(ActivityTemplate, {
        user_id,
        id: Not(In(activityTemplateIds)),
        activity_type: ActivityType.library,
      });
      const parents = activityTemplates.filter(({ parent_id }) => !parent_id);
      const choices = activityTemplates.filter(({ parent_id }) => !!parent_id);
      await transactionalEntityManager.upsert(ActivityTemplate, parents, ['id']);
      await transactionalEntityManager.upsert(ActivityTemplate, choices, ['id']);
      // delete existing log quantity questions that aren't in the update data
      // but are linked to one of the incoming templates
      const incomingQuestionIds = logQuantityQuestions
        .map((question) => question.id)
        .filter((questionId) => !!questionId);
      await transactionalEntityManager.delete(LogQuantityQuestion, {
        user_id,
        id: Not(In(incomingQuestionIds)),
        activity_template_id: In(activityTemplateIds),
      });
      await transactionalEntityManager.upsert(LogQuantityQuestion, logQuantityQuestions, ['id']);
    });
  }
}
