import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { ToDo } from '../entities/to-do.entity';
import { GetToDosQueryDto } from '../dto/get-to-dos-query.dto';

@Injectable()
export class ToDoRepository extends BaseRepository<ToDo> {
  constructor(private readonly connection: Connection) {
    super(connection, ToDo);
  }

  async getUserToDos(userId: string, { page_num = 1, status, eisenhower_quadrant }: GetToDosQueryDto) {
    const take = 50;
    const skip = page_num * take - take;
    const query = this.orm
      .createQueryBuilder('to_do')
      .leftJoinAndSelect('to_do.tags', 'tags')
      .select([
        'to_do.id',
        'to_do.title',
        'to_do.details',
        'to_do.due_date',
        'to_do.eisenhower_quadrant',
        'to_do.status',
        'to_do.focus_type',
        'to_do.external_task_metadata',
        'tags.id',
        'tags.text',
      ])
      .take(take)
      .skip(skip)
      .where('to_do.user_id = :user_id', { user_id: userId });

    if (status) {
      query.andWhere('to_do.status = :status', { status });
    }
    if (eisenhower_quadrant) {
      query.andWhere('to_do.eisenhower_quadrant = :eisenhower_quadrant', { eisenhower_quadrant });
    }
    return query.getMany();
  }
}
