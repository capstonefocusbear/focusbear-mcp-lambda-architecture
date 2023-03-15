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

@Injectable()
export class HabitPackRepository extends BaseRepository<HabitPack> {
  constructor(private readonly connection: Connection) {
    super(connection, HabitPack);
  }

  async consistentlyUpdateHabitPack(
    { ...updateData }: HabitPack,
    activityIds: string[],
    activitiesData?: ActivityTemplate[][],
  ) {
    await AppDataSource.manager.transaction('SERIALIZABLE', async (transactionalEntityManager) => {
      await transactionalEntityManager.upsert(HabitPack, updateData, ['id']);
      await transactionalEntityManager.delete(ActivityTemplate, { pack_id: updateData.id, id: Not(In(activityIds)) });
      await Promise.all(
        activitiesData.map(async (type) => {
          const parents = type.filter(({ parent_id }) => !parent_id);
          const choices = type.filter(({ parent_id }) => !!parent_id);
          await transactionalEntityManager.upsert(ActivityTemplate, parents, ['id']);
          await transactionalEntityManager.upsert(ActivityTemplate, choices, ['id']);
        }),
      );
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
        'activity_templates.id',
        'activity_templates.log_quantity',
        'activity_templates.duration_seconds',
        'activity_templates.completion_requirements',
        'activity_templates.log_summary_type',
        'activity_templates.activity_type',
        'activity_templates.activity_data',
        'activity_templates.parent_id',
        'activity_templates.pack_id',
        'choices.id',
        'choices.log_quantity',
        'choices.duration_seconds',
        'choices.completion_requirements',
        'choices.log_summary_type',
        'choices.activity_type',
        'choices.activity_data',
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
        'activity_templates.id',
        'activity_templates.log_quantity',
        'activity_templates.duration_seconds',
        'activity_templates.completion_requirements',
        'activity_templates.log_summary_type',
        'activity_templates.activity_type',
        'activity_templates.activity_data',
        'activity_templates.parent_id',
        'activity_templates.pack_id',
        'choices.id',
        'choices.log_quantity',
        'choices.duration_seconds',
        'choices.completion_requirements',
        'choices.log_summary_type',
        'choices.activity_type',
        'choices.activity_data',
      ]);

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
