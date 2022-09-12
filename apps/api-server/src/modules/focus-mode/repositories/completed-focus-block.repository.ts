import { Injectable } from '@nestjs/common';
import { Between, Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { CompletedFocusBlock } from '../entities/completed-focus-block.entity';

@Injectable()
export class CompletedFocusBlockRepository extends BaseRepository<CompletedFocusBlock> {
  constructor(private readonly connection: Connection) {
    super(connection, CompletedFocusBlock);
  }

  async getLogsByUserInTimeRange(
    user_id: string,
    { from_time = new Date(Date.now() - 24 * 60 * 60 * 1000), to_time = new Date() },
  ): Promise<CompletedFocusBlock[]> {
    return this.orm.find({
      where: {
        user_id,
        finish_time: Between(from_time, to_time),
      },
      order: {
        start_time: 'DESC',
      },
      relations: ['focus_mode'],
    });
  }
}
