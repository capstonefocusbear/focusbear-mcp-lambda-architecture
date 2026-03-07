import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { PageOrder } from '../../../shared/domain/page-order.enum';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { ToDo } from '../entities/to-do.entity';
import { GetToDosQueryDto } from '../dto/get-to-dos-query.dto';
import { SearchToDosDto } from '../dto/search-to-do.dto';
import { RecentToDoDto } from '../dto/recent-to-do.dto';
import { ToDoSortMode } from '../domain/to-do-sort-mode.enum';

@Injectable()
export class ToDoRepository extends BaseRepository<ToDo> {
  private static readonly EFFORT_MINUTES = `
    CASE to_do.perspiration_level
      WHEN 1 THEN 5
      WHEN 2 THEN 15
      WHEN 3 THEN 30
      WHEN 4 THEN 60
      WHEN 5 THEN 240
      WHEN 6 THEN 240
      WHEN 7 THEN 480
      WHEN 8 THEN 480
      WHEN 9 THEN 3360
      WHEN 10 THEN 3360
      ELSE 5
    END
  `;

  public static readonly TOP_SCORE_SQL = `
    CASE
      WHEN to_do.due_date IS NULL THEN 0.1
      WHEN to_do.due_date::date < CURRENT_DATE THEN 
        /* Overdue: base score + 1 point per overdue day (no cap) */
        10.0 + (CURRENT_DATE - to_do.due_date::date)
      WHEN to_do.due_date::date = CURRENT_DATE THEN 9.0
      ELSE GREATEST(
        0.1,
        /* Final formula: ((base / 8) * 10) * modifier */
        (
          /* base = GREATEST(0.1, 8 - LN(days_until_due + 1) * 1.5) */
          GREATEST(
            0.1,
            8.0 - LN((EXTRACT(DAY FROM (to_do.due_date - CURRENT_DATE))::numeric + 1.0)) * 1.5
          ) / 8.0
        ) * 10.0
        *
        /* modifier = minutes / (minutes + 60 * days_until_due) */
        (
          (${ToDoRepository.EFFORT_MINUTES})::numeric
          / NULLIF(
              (${ToDoRepository.EFFORT_MINUTES})::numeric
              + 60.0 * (EXTRACT(DAY FROM (to_do.due_date - CURRENT_DATE))::numeric),
              0
            )
        )
      )
    END
    * (
      COALESCE(to_do.outcome::numeric, 0.0)
      / GREATEST(1.0, LEAST(10.0, COALESCE(to_do.perspiration_level::numeric, 1.0)))
    )
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
      sort_mode,
    }: GetToDosQueryDto,
  ): Promise<[ToDo[], number]> {
    const query = this.orm
      .createQueryBuilder('to_do')
      .leftJoinAndSelect('to_do.tags', 'tags')
      .leftJoin('to_do.assignee', 'assignee')
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
        'to_do.objective',
        'to_do.subtasks',
        'tags.id',
        'tags.text',
        'to_do.duration',
        'to_do.icon',
        'to_do.perspiration_level',
        'to_do.outcome',
        'assignee.id',
        'assignee.username',
      ])
      .addSelect(`(${ToDoRepository.TOP_SCORE_SQL})`, 'top_score')
      .take(take)
      .skip(skip)
      .where('to_do.user_id = :user_id', { user_id: userId });

    const orderBy = order === PageOrder.ASC ? 'ASC' : 'DESC';
    if (sort_mode === ToDoSortMode.CHRONOLOGICAL) {
      query.orderBy('to_do.created_at', orderBy);
    } else {
      query.orderBy('top_score', orderBy);
    }

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

    const { entities: todos, raw: rows } = await query.getRawAndEntities();

    // Map top_score from raw rows
    // Using Map to avoid array index issues with joins
    const ALIAS_TODO_ID = 'to_do_id';
    const ALIAS_TOP_SCORE = 'top_score';

    const topScoreByTodoId = new Map<string, number>();

    for (const row of rows as any[]) {
      const id = String(row[ALIAS_TODO_ID]);
      const score = row[ALIAS_TOP_SCORE];

      if (id && score != null && !topScoreByTodoId.has(id)) {
        topScoreByTodoId.set(id, Number(score));
      }
    }

    const resultsWithTopScore = todos.map((todo) => ({
      ...todo,
      top_score: topScoreByTodoId.get(String((todo as any).id)) ?? null,
    }));

    // Count: keep joins, just make it distinct + unpaginated + unordered
    const totalCount = await query
      .select('to_do.id')
      .distinct(true)
      .orderBy()
      .skip(undefined)
      .take(undefined)
      .getCount();

    return [resultsWithTopScore, totalCount];
  }

  async searchUserToDos({ title, take }: SearchToDosDto, userId: string) {
    const result = await this.orm
      .createQueryBuilder('to_do')
      .leftJoinAndSelect('to_do.tags', 'tags')
      .leftJoin('to_do.assignee', 'assignee')
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
        'assignee.id',
        'assignee.username',
      ])
      .where('to_do.user_id = :user_id', { user_id: userId })
      .getMany();
    // @Description: todo title is an encrypted column
    return result.filter((todo) => todo.title?.toLowerCase().includes(title?.toLowerCase())).slice(0, take);
  }

  async getUserRecentToDos({ updated_at, status, take }: RecentToDoDto, user_id: string) {
    const query = this.orm
      .createQueryBuilder('to_do')
      .leftJoinAndSelect('to_do.tags', 'tags')
      .leftJoin('to_do.assignee', 'assignee')
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
        'assignee.id',
        'assignee.username',
      ])
      .where('to_do.user_id = :user_id', {
        user_id,
      })
      .andWhere('to_do.status IN (:...status)', {
        status,
      })
      .orderBy('to_do.updated_at', 'DESC')
      .take(take);

    if (updated_at) {
      query.andWhere('to_do.updated_at >= :updated_at', {
        updated_at,
      });
    }

    return query.getMany();
  }
}
