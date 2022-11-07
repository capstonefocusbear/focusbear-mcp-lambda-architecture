import { Injectable } from '@nestjs/common';
import { Connection, EntityManager, In, Not, Transaction, TransactionManager } from 'typeorm';
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

  @Transaction({ isolation: 'SERIALIZABLE' })
  async consistentlyUpdateHabitPack(
    { ...updateData }: HabitPack,
    activityIds: string[],
    activitiesData?: ActivityTemplate[][],
    @TransactionManager() manager?: EntityManager,
  ) {
    await manager.upsert(HabitPack, updateData, ['id']);
    await manager.delete(ActivityTemplate, { pack_id: updateData.id, id: Not(In(activityIds)) });
    await Promise.all(
      activitiesData.map(async (type) => {
        const parents = type.filter(({ parent_id }) => !parent_id);
        const choices = type.filter(({ parent_id }) => !!parent_id);
        await manager.upsert(ActivityTemplate, parents, ['id']);
        await manager.upsert(ActivityTemplate, choices, ['id']);
      }),
    );
  }

  @Transaction({ isolation: 'SERIALIZABLE' })
  async consistentlyInstallStandaloneHabitPack(
    activitiesData: DeserializedActivity,
    @TransactionManager() manager?: EntityManager,
  ) {
    const { sequence, activities } = activitiesData;
    await manager.upsert(ActivitySequence, sequence, ['id']);
    const parents = activities.filter(({ parent_id }) => !parent_id);
    const choices = activities.filter(({ parent_id }) => !!parent_id);
    await manager.upsert(Activity, parents, ['id']);
    await manager.upsert(Activity, choices, ['id']);
  }

  async getHabitPack(pack_id: string): Promise<HabitPack> {
    const fetchedPack = await this.orm
      .createQueryBuilder('habit_packs')
      .leftJoinAndSelect('habit_packs.activity_templates', 'activity_templates')
      .leftJoinAndSelect('activity_templates.choices', 'choices')
      .select([
        'habit_packs.id',
        'habit_packs.pack_name',
        'habit_packs.creator_name',
        'habit_packs.pack_type',
        'habit_packs.description',
        'habit_packs.description_video_url',
        'habit_packs.welcome_message',
        'habit_packs.welcome_video_url',
        'habit_packs.marketplace_approval_status',
        'habit_packs.marketplace_request',
        'activity_templates.id',
        'activity_templates.log_quantity',
        'activity_templates.duration_seconds',
        'activity_templates.log_summary_type',
        'activity_templates.activity_type',
        'activity_templates.activity_data',
        'activity_templates.parent_id',
        'activity_templates.pack_id',
        'choices.id',
        'choices.log_quantity',
        'choices.duration_seconds',
        'choices.log_summary_type',
        'choices.activity_type',
        'choices.activity_data',
      ])
      .where('habit_packs.id = :id', { id: pack_id })
      .getOne();

    return fetchedPack;
  }

  async getUserInstalledPacks(packIds: string[]): Promise<HabitPack[]> {
    const fetchedPacks = await this.orm
      .createQueryBuilder('habit_packs')
      .leftJoinAndSelect('habit_packs.activity_templates', 'activity_templates')
      .leftJoinAndSelect('activity_templates.choices', 'choices')
      .select([
        'habit_packs.id',
        'habit_packs.pack_name',
        'habit_packs.creator_name',
        'habit_packs.pack_type',
        'habit_packs.description',
        'habit_packs.description_video_url',
        'habit_packs.welcome_message',
        'habit_packs.welcome_video_url',
        'habit_packs.marketplace_approval_status',
        'habit_packs.marketplace_request',
        'activity_templates.id',
        'activity_templates.log_quantity',
        'activity_templates.duration_seconds',
        'activity_templates.log_summary_type',
        'activity_templates.activity_type',
        'activity_templates.activity_data',
        'activity_templates.parent_id',
        'activity_templates.pack_id',
        'choices.id',
        'choices.log_quantity',
        'choices.duration_seconds',
        'choices.log_summary_type',
        'choices.activity_type',
        'choices.activity_data',
      ])
      .where('habit_packs.id IN (:...id_array)', { id_array: packIds })
      .getMany();

    return fetchedPacks;
  }

  async fetchPacksByFilter({
    pack_type,
    marketplace_approval_status,
    is_featured,
  }: GetMultiplePacksQueryDto): Promise<HabitPack[]> {
    const query = this.orm
      .createQueryBuilder('habit_packs')
      .leftJoinAndSelect('habit_packs.activity_templates', 'activity_templates')
      .leftJoinAndSelect('activity_templates.choices', 'choices')
      .select([
        'habit_packs.id',
        'habit_packs.pack_name',
        'habit_packs.creator_name',
        'habit_packs.pack_type',
        'habit_packs.description',
        'habit_packs.description_video_url',
        'habit_packs.welcome_message',
        'habit_packs.welcome_video_url',
        'habit_packs.marketplace_approval_status',
        'habit_packs.marketplace_request',
        'habit_packs.is_featured',
        'activity_templates.id',
        'activity_templates.log_quantity',
        'activity_templates.duration_seconds',
        'activity_templates.log_summary_type',
        'activity_templates.activity_type',
        'activity_templates.activity_data',
        'activity_templates.parent_id',
        'activity_templates.pack_id',
        'choices.id',
        'choices.log_quantity',
        'choices.duration_seconds',
        'choices.log_summary_type',
        'choices.activity_type',
        'choices.activity_data',
      ]);

    if (pack_type) {
      query.andWhere('habit_packs.pack_type = :pack_type', { pack_type });
    }
    query.andWhere('habit_packs.marketplace_approval_status = :marketplace_approval_status', {
      marketplace_approval_status,
    });
    query.andWhere('habit_packs.is_featured = :is_featured', { is_featured });
    const fetchedPacks = await query.getMany();
    return fetchedPacks;
  }
}
