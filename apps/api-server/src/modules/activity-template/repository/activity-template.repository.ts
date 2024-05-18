import { Injectable } from '@nestjs/common';
import { Connection, In, Not } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { ActivityTemplate } from '../entity/activity-template.entity';
import { AppDataSource } from '../../../../ormconfig';
import { ActivityType } from '../../activity/domain/activity-type.enum';
import { LogQuantityQuestion } from '../../activity/entities/log-quantity-questions';
import { ActivityTemplateTag } from '../entity/activity-template-tag.entity';
import { convertMinutesToSeconds } from '../../../shared/utils/helpers';
import { GetRoutineSuggestionsDto } from '../dto/get-routine-suggestions.dto';

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
    templateTags: ActivityTemplateTag[],
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
      await transactionalEntityManager.upsert(ActivityTemplateTag, templateTags, ['id']);
    });
  }

  async getActivityTemplatesWithGoalsMatched(getRoutineSuggestionsDto: GetRoutineSuggestionsDto) {
    const duration_seconds = convertMinutesToSeconds(getRoutineSuggestionsDto.routine_duration);
    const allowed_routines = [ActivityType.morning, ActivityType.evening];

    return this.orm
      .createQueryBuilder('activity_templates')
      .leftJoinAndSelect('activity_templates.tags', 'template_tags')
      .where('template_tags.tags ?| :goals')
      .andWhere('activity_templates.activity_type IN (:...allowed_routines)')
      .andWhere('activity_templates.duration_seconds <= :duration_seconds')
      .setParameters({
        goals: getRoutineSuggestionsDto.user_goals,
        allowed_routines,
        duration_seconds,
      })
      .select('activity_templates')
      .getMany();
  }
}
