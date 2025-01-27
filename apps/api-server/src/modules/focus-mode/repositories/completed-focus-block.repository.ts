import { Injectable } from '@nestjs/common';
import { Between, Connection, IsNull } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { CompletedFocusBlock } from '../entities/completed-focus-block.entity';
import { GetFocusStatsQueryDto } from '../dto/get-focus-stats-query.dto';
import { CURRENT_TIME, TWENTY_FOUR_HOURS_AGO } from '../../../shared/utils/constants';

@Injectable()
export class CompletedFocusBlockRepository extends BaseRepository<CompletedFocusBlock> {
  constructor(private readonly connection: Connection) {
    super(connection, CompletedFocusBlock);
  }

  async getLogsByUserInTimeRange(
    user_id: string,
    { from_time = TWENTY_FOUR_HOURS_AGO, to_time = CURRENT_TIME },
  ): Promise<CompletedFocusBlock[]> {
    return this.orm.find({
      select: [
        'finish_time',
        'start_time',
        'focus_duration_seconds',
        'intention',
        'achievements',
        'distractions',
        'created_at',
        'updated_at',
        'metadata',
      ],
      where: {
        user_id,
        finish_time: Between(from_time, to_time),
        focus_mode: { deleted_at: IsNull() },
      },
      order: {
        start_time: 'DESC',
      },
      relations: ['focus_mode'],
    });
  }

  async getLogsByFocusModeTagInTimeRange(
    tag_id: string,
    { from_time = TWENTY_FOUR_HOURS_AGO, to_time = CURRENT_TIME },
  ): Promise<CompletedFocusBlock[]> {
    return this.orm.find({
      select: ['finish_time', 'start_time', 'focus_duration_seconds', 'intention', 'achievements', 'distractions'],
      where: {
        tags: { id: tag_id },
        finish_time: Between(from_time, to_time),
      },
      order: {
        start_time: 'DESC',
      },
      relations: ['focus_mode'],
    });
  }

  async getFocusBlockLogsForTimeRange(
    user_id: string,
    getFocusBlockStatsQuery: GetFocusStatsQueryDto,
  ): Promise<CompletedFocusBlock[]> {
    const { from_time, to_time, focus_mode_id, tag_id } = getFocusBlockStatsQuery;
    const query = this.orm
      .createQueryBuilder('completed_focus_blocks')
      .leftJoinAndSelect('completed_focus_blocks.focus_mode', 'focus_mode')
      .leftJoinAndSelect('completed_focus_blocks.tags', 'tags')
      .select([
        'completed_focus_blocks.id',
        'completed_focus_blocks.start_time',
        'completed_focus_blocks.finish_time',
        'completed_focus_blocks.focus_duration_seconds',
        'completed_focus_blocks.achievements',
        'completed_focus_blocks.distractions',
        'focus_mode.name',
        'tags.id',
        'tags.text',
      ])
      .where('completed_focus_blocks.start_time > :from_time', { from_time })
      .andWhere('completed_focus_blocks.finish_time < :to_time', { to_time })
      .andWhere('completed_focus_blocks.user_id = :user_id', { user_id });
    if (focus_mode_id) {
      query.andWhere('completed_focus_blocks.focus_mode_id = :focus_mode_id', { focus_mode_id });
    }
    if (tag_id) {
      query.andWhere('tags.id = :tag_id', { tag_id });
    }
    return query.getMany();
  }
}
