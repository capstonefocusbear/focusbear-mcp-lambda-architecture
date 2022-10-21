import { Injectable } from '@nestjs/common';
import { Connection, EntityManager, In, Not, Transaction, TransactionManager } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { ActivityTemplate } from '../../activity-template/entity/activity-template.entity';
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

  async getApprovedHabitPacks(): Promise<HabitPack[]> {
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
      .where('habit_packs.marketplace_approval_status = :true', { true: true })
      .getMany();

    return fetchedPack;
  }
}
