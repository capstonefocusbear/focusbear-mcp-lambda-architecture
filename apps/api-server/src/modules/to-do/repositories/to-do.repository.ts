import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { PageOrder } from '../../../shared/domain/page-order.enum';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { ToDo } from '../entities/to-do.entity';
import { GetToDosQueryDto } from '../dto/get-to-dos-query.dto';
import { SearchToDosDto } from '../dto/search-to-do.dto';
import { RecentToDoDto } from '../dto/recent-to-do.dto';

@Injectable()
export class ToDoRepository extends BaseRepository<ToDo> {
  public static readonly TOP_SCORE_SQL = `
    (
      CASE 
        WHEN to_do.due_date IS NULL THEN 5.0
        WHEN to_do.due_date < CURRENT_DATE THEN 10.0
        WHEN to_do.due_date = CURRENT_DATE THEN 9.9
        ELSE GREATEST(0.1, 9.9 - (EXTRACT(DAY FROM (to_do.due_date - CURRENT_DATE)) * 9.8 / 365.0))
      END
    ) * (to_do.outcome::float / NULLIF(to_do.perspiration_level, 0))
  `;

  constructor(private readonly connection: Connection) {
    super(connection, ToDo);
  }

  async getUserToDos(
    userId: string,
    {
      order,
      take,
      skip,
      status,
      eisenhower_quadrant,
      tag_id,
      perspiration_gte,
      perspiration_lte,
      synced_project_id,
    }: GetToDosQueryDto,
  ): Promise<[ToDo[], number]> {
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
        'to_do.perspiration_level',
        'to_do.outcome',
      ])
      .take(take)
      .skip(skip)
      .where('to_do.user_id = :user_id', { user_id: userId });

    // order by the score (normalized to scale of 10: overdue=10, due today=9.9, due in morethan 1 year=0.1, no due date=5)
    query.addSelect(ToDoRepository.TOP_SCORE_SQL, 'top_score');
    query.orderBy('top_score', order === PageOrder.ASC ? 'ASC' : 'DESC');
    if (status) {
      query.andWhere('to_do.status = :status', { status });
    } else {
      query.andWhere("to_do.status != 'COMPLETED'");
    }
    if (eisenhower_quadrant) {
      query.andWhere('to_do.eisenhower_quadrant = :eisenhower_quadrant', { eisenhower_quadrant });
    }
    if (tag_id) {
      query.andWhere('tags.id = :tag_id', { tag_id });
    }
    if (perspiration_gte) {
      query.andWhere('to_do.perspiration_level >= :perspiration_gte', { perspiration_gte });
    }
    if (perspiration_lte) {
      query.andWhere('to_do.perspiration_level <= :perspiration_lte', { perspiration_lte });
    }
    if (synced_project_id) {
      query.andWhere('to_do.synced_project_id = :synced_project_id', { synced_project_id });
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
      .where('to_do.user_id = :user_id', { user_id: userId })
      .getMany();
    // @Description: todo title is an encrypted column
    return result.filter((todo) => todo.title?.toLowerCase().includes(title?.toLowerCase())).slice(0, take);
  }

  async getUserRecentToDos({ updated_at, status, take }: RecentToDoDto, user_id: string) {
    return this.orm
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
      .where('to_do.user_id = :user_id', {
        user_id,
      })
      .andWhere('to_do.updated_at >= :updated_at', {
        updated_at,
      })
      .andWhere('to_do.status IN (:...status)', {
        status,
      })
      .orderBy('to_do.updated_at', 'DESC')
      .take(take)
      .getMany();
  }
}
