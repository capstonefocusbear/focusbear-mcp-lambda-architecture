import { Injectable } from '@nestjs/common';
import { Connection, In, Not } from 'typeorm';
import { AppDataSource } from '../../../../ormconfig';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { ActivityTemplate } from '../../activity-template/entity/activity-template.entity';
import { ActivitySequence } from '../../activity/entities/activity-sequence.entity';
import { Activity } from '../../activity/entities/activity.entity';
import { DeserializedActivity } from '../../activity/services/activity-parser/activity-parser.service';
import { GetMultiplePacksQueryDto } from '../dto/get-multiple-packs-query.dto';
import { HabitPack } from '../entity/habit-pack.entity';
import { LogQuantityQuestion } from '../../activity/entities/log-quantity-questions';

@Injectable()
export class HabitPackRepository extends BaseRepository<HabitPack> {
  constructor(private readonly connection: Connection) {
    super(connection, HabitPack);
  }

  async consistentlyUpdateHabitPack(
    { ...updateData }: HabitPack,
    activityTemplateIds: string[],
    activitiesData: ActivityTemplate[][],
    logQuantityQuestions: LogQuantityQuestion[],
  ) {
    await AppDataSource.manager.transaction('SERIALIZABLE', async (transactionalEntityManager) => {
      await transactionalEntityManager.upsert(HabitPack, updateData, ['id']);
      await transactionalEntityManager.delete(ActivityTemplate, {
        pack_id: updateData.id,
        id: Not(In(activityTemplateIds)),
      });
      const allActivityTemplatesFromPack = activitiesData.reduce(
        (accumulator, currentValue) => accumulator.concat(currentValue),
        [],
      );
      // see docs/linked-activity-template-id.md
      const parentsWithoutLinks = allActivityTemplatesFromPack.filter(
        ({ parent_id, linked_activity_template_id }) => !parent_id && !linked_activity_template_id,
      );
      const parentsWithLinks = allActivityTemplatesFromPack.filter(
        ({ parent_id, linked_activity_template_id }) => !parent_id && linked_activity_template_id,
      );
      const choicesWithoutLinks = allActivityTemplatesFromPack.filter(
        ({ parent_id, linked_activity_template_id }) => !!parent_id && !linked_activity_template_id,
      );
      const choicesWithLinks = allActivityTemplatesFromPack.filter(
        ({ parent_id, linked_activity_template_id }) => !!parent_id && !!linked_activity_template_id,
      );
      await transactionalEntityManager.upsert(ActivityTemplate, parentsWithoutLinks, ['id']);
      await transactionalEntityManager.upsert(ActivityTemplate, parentsWithLinks, ['id']);
      await transactionalEntityManager.upsert(ActivityTemplate, choicesWithoutLinks, ['id']);
      await transactionalEntityManager.upsert(ActivityTemplate, choicesWithLinks, ['id']);
      // delete existing log quantity questions that aren't in the update data
      // but are linked to one of the incoming templates
      const incomingQuestionIds = logQuantityQuestions
        .map((question) => question.id)
        .filter((questionId) => !!questionId);
      await transactionalEntityManager.delete(LogQuantityQuestion, {
        user_id: updateData.user_id,
        id: Not(In(incomingQuestionIds)),
        activity_template_id: In(activityTemplateIds),
      });
      const questionsWithoutLinks = logQuantityQuestions.filter(({ linked_question_id }) => !linked_question_id);
      const questionsWithLinks = logQuantityQuestions.filter(({ linked_question_id }) => !!linked_question_id);
      await transactionalEntityManager.upsert(LogQuantityQuestion, questionsWithoutLinks, ['id']);
      await transactionalEntityManager.upsert(LogQuantityQuestion, questionsWithLinks, ['id']);
    });
  }

  async consistentlyInstallStandaloneHabitPack(activitiesData: DeserializedActivity) {
    await AppDataSource.manager.transaction('SERIALIZABLE', async (transactionalEntityManager) => {
      const { sequence, activities } = activitiesData;
      await transactionalEntityManager.upsert(ActivitySequence, sequence, ['id']);
      const parents = activities.filter(({ parent_id }) => !parent_id);
      const choices = activities.filter(({ parent_id }) => !!parent_id);
      await transactionalEntityManager.upsert(Activity, parents, ['id']);
      await transactionalEntityManager.upsert(Activity, choices, ['id']);
    });
  }

  async getHabitPack(pack_id: string): Promise<HabitPack> {
    const fetchedPack = await this.orm
      .createQueryBuilder('habit_packs')
      .leftJoinAndSelect('habit_packs.activity_templates', 'activity_templates')
      .orderBy('activity_templates.sequence_index', 'ASC')
      .leftJoinAndSelect('activity_templates.choices', 'choices')
      .leftJoinAndSelect('activity_templates.log_quantity_questions', 'log_quantity_questions')
      .leftJoinAndSelect('choices.log_quantity_questions', 'choices_log_quantity_questions')
      .select([
        'habit_packs.id',
        'habit_packs.pack_name',
        'habit_packs.user_id',
        'habit_packs.creator_name',
        'habit_packs.pack_type',
        'habit_packs.description',
        'habit_packs.description_plain_text',
        'habit_packs.description_video_url',
        'habit_packs.welcome_message',
        'habit_packs.welcome_message_plain_text',
        'habit_packs.welcome_video_url',
        'habit_packs.marketplace_approval_status',
        'habit_packs.marketplace_request',
        'habit_packs.featured_for_onboarding',
        'habit_packs.is_featured',
        'habit_packs.duration',
        'habit_packs.morning_routine_duration_seconds',
        'habit_packs.evening_routine_duration_seconds',
        'habit_packs.breaks_only',
        'habit_packs.language',
        'activity_templates.id',
        'activity_templates.log_quantity',
        'activity_templates.duration_seconds',
        'activity_templates.completion_requirements',
        'activity_templates.log_summary_type',
        'activity_templates.activity_type',
        'activity_templates.activity_data',
        'activity_templates.parent_id',
        'activity_templates.pack_id',
        'activity_templates.linked_activity_template_id',
        'activity_templates.check_list',
        'activity_templates.impact_category',
        'choices.id',
        'choices.log_quantity',
        'choices.duration_seconds',
        'choices.completion_requirements',
        'choices.log_summary_type',
        'choices.activity_type',
        'choices.activity_data',
        'choices.linked_activity_template_id',
        'log_quantity_questions.id',
        'log_quantity_questions.question',
        'log_quantity_questions.min_value',
        'log_quantity_questions.max_value',
        'log_quantity_questions.min_value_description',
        'log_quantity_questions.max_value_description',
        'log_quantity_questions.log_summary_type',
        'log_quantity_questions.linked_question_id',
        'choices_log_quantity_questions.id',
        'choices_log_quantity_questions.question',
        'choices_log_quantity_questions.min_value',
        'choices_log_quantity_questions.max_value',
        'choices_log_quantity_questions.min_value_description',
        'choices_log_quantity_questions.max_value_description',
        'choices_log_quantity_questions.log_summary_type',
        'choices_log_quantity_questions.linked_question_id',
      ])
      .where('habit_packs.id = :id', { id: pack_id })
      .getOne();

    return fetchedPack;
  }

  async fetchPacksByFilter({
    pack_type,
    marketplace_approval_status,
    is_featured,
    featured_for_onboarding,
    language,
    user_id,
    breaks_only,
  }: GetMultiplePacksQueryDto): Promise<HabitPack[]> {
    const query = this.orm
      .createQueryBuilder('habit_packs')
      .leftJoinAndSelect('habit_packs.activity_templates', 'activity_templates')
      .orderBy('activity_templates.sequence_index', 'ASC')
      .leftJoinAndSelect('activity_templates.choices', 'choices')
      .leftJoinAndSelect('activity_templates.log_quantity_questions', 'log_quantity_questions')
      .leftJoinAndSelect('choices.log_quantity_questions', 'choices_log_quantity_questions')
      .select([
        'habit_packs.id',
        'habit_packs.pack_name',
        'habit_packs.user_id',
        'habit_packs.creator_name',
        'habit_packs.pack_type',
        'habit_packs.description',
        'habit_packs.description_plain_text',
        'habit_packs.description_video_url',
        'habit_packs.welcome_message',
        'habit_packs.welcome_message_plain_text',
        'habit_packs.welcome_video_url',
        'habit_packs.marketplace_approval_status',
        'habit_packs.marketplace_request',
        'habit_packs.featured_for_onboarding',
        'habit_packs.is_featured',
        'habit_packs.duration',
        'habit_packs.morning_routine_duration_seconds',
        'habit_packs.evening_routine_duration_seconds',
        'habit_packs.breaks_only',
        'habit_packs.language',
        'activity_templates.id',
        'activity_templates.log_quantity',
        'activity_templates.duration_seconds',
        'activity_templates.completion_requirements',
        'activity_templates.log_summary_type',
        'activity_templates.activity_type',
        'activity_templates.activity_data',
        'activity_templates.parent_id',
        'activity_templates.pack_id',
        'activity_templates.linked_activity_template_id',
        'activity_templates.check_list',
        'activity_templates.impact_category',
        'choices.id',
        'choices.log_quantity',
        'choices.duration_seconds',
        'choices.completion_requirements',
        'choices.log_summary_type',
        'choices.activity_type',
        'choices.activity_data',
        'choices.linked_activity_template_id',
        'log_quantity_questions.id',
        'log_quantity_questions.question',
        'log_quantity_questions.min_value',
        'log_quantity_questions.max_value',
        'log_quantity_questions.min_value_description',
        'log_quantity_questions.max_value_description',
        'log_quantity_questions.log_summary_type',
        'log_quantity_questions.linked_question_id',
        'choices_log_quantity_questions.id',
        'choices_log_quantity_questions.question',
        'choices_log_quantity_questions.min_value',
        'choices_log_quantity_questions.max_value',
        'choices_log_quantity_questions.min_value_description',
        'choices_log_quantity_questions.max_value_description',
        'choices_log_quantity_questions.log_summary_type',
        'choices_log_quantity_questions.linked_question_id',
      ])
      .orderBy('habit_packs.pack_name', 'ASC');

    if (pack_type) {
      query.andWhere('habit_packs.pack_type = :pack_type', { pack_type });
    }
    if (typeof marketplace_approval_status === 'boolean') {
      query.andWhere('habit_packs.marketplace_approval_status = :marketplace_approval_status', {
        marketplace_approval_status,
      });
    }
    if (typeof is_featured === 'boolean') {
      query.andWhere('habit_packs.is_featured = :is_featured', { is_featured });
    }
    if (typeof featured_for_onboarding === 'boolean') {
      query.andWhere('habit_packs.featured_for_onboarding = :featured_for_onboarding', { featured_for_onboarding });
    }
    if (language) {
      query.andWhere('habit_packs.language = :language', { language });
    } else {
      query.andWhere('habit_packs.language = :default_language', { default_language: 'en' });
    }
    if (user_id) {
      query.andWhere('habit_packs.user_id = :user_id', { user_id });
    }
    if (typeof breaks_only === 'boolean') {
      query.andWhere('habit_packs.breaks_only = :breaks_only', {
        breaks_only,
      });
    }
    const fetchedPacks = await query.getMany();
    return fetchedPacks;
  }
}
