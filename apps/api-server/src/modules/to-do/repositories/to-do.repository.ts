import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { ToDo } from '../entities/to-do.entity';
import { GetToDosQueryDto } from '../dto/get-to-dos-query.dto';
import { SearchToDosDto } from '../dto/search-to-do.dto';
import { RecentToDoDto } from '../dto/recent-to-do.dto';

@Injectable()
export class ToDoRepository extends BaseRepository<ToDo> {
  constructor(private readonly connection: Connection) {
    super(connection, ToDo);
  }

  async getUserToDos(userId: string, { take, skip, status, eisenhower_quadrant }: GetToDosQueryDto) {
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
        'to_do.external_task_id',
        'to_do.external_task_metadata',
        'to_do.created_at',
        'to_do.subtasks',
        'to_do.objective',
        'tags.id',
        'tags.text',
        'to_do.duration',
        'to_do.icon',
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
    return query.getManyAndCount();
  }

  async searchUserToDos({ title, take }: SearchToDosDto, userId: string) {
    const result = await this.orm
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
        'to_do.external_task_id',
        'to_do.external_task_metadata',
        'to_do.created_at',
        'to_do.subtasks',
        'to_do.objective',
        'tags.id',
        'tags.text',
        'to_do.duration',
        'to_do.icon',
      ])
      .where('to_do.user_id = :user_id AND to_do.status != :status', { user_id: userId, status: 'COMPLETED' })
      .getMany();
    // @Description: todo title is an encrypted column
    return result.filter((todo) => todo.title.includes(title)).slice(0, take);
  }

  async getUserRecentToDos({ updated_at, take }: RecentToDoDto, user_id: string) {
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
        'to_do.external_task_id',
        'to_do.external_task_metadata',
        'to_do.created_at',
        'to_do.subtasks',
        'to_do.objective',
        'tags.id',
        'tags.text',
        'to_do.duration',
        'to_do.icon',
        'to_do.updated_at',
      ])
      .orderBy('to_do.updated_at', 'DESC')
      .take(take);

    if (updated_at) {
      query.where('to_do.user_id = :user_id AND to_do.updated_at >= :updated_at', { user_id, updated_at });
    }
    return query.getMany();
  }
}
