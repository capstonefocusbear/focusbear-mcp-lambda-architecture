import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { Note } from '../entities/note.entity';
import { GetNotesQueryDto } from '../dto/get-notes-query.dto';
import { PageOrder } from '../../../shared/domain/page-order.enum';

@Injectable()
export class NoteRepository extends BaseRepository<Note> {
  constructor(private readonly dataSource: DataSource) {
    super(dataSource, Note);
  }

  async getUserNotes(
    userId: string,
    { order, take, skip, completed_activity_id, tag_id }: GetNotesQueryDto,
  ): Promise<[Note[], number]> {
    const query = this.orm
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.tags', 'tags')
      .leftJoinAndSelect('note.embedded_todos', 'embedded_todos')
      .leftJoinAndSelect('note.completed_activity', 'completed_activity')
      .leftJoinAndSelect('completed_activity.activity', 'activity')
      .select([
        'note.id',
        'note.title',
        'note.body',
        'note.completed_activity_id',
        'note.created_at',
        'note.updated_at',
        'tags.id',
        'tags.text',
        'tags.color',
        'embedded_todos.id',
        'embedded_todos.title',
        'embedded_todos.status',
        'completed_activity.id',
        'completed_activity.start_time',
        'activity.id',
        'activity.activity_data',
      ])
      .where('note.user_id = :user_id', { user_id: userId })
      .take(take)
      .skip(skip)
      .orderBy('note.created_at', order === PageOrder.ASC ? 'ASC' : 'DESC');

    if (completed_activity_id) {
      query.andWhere('note.completed_activity_id = :completed_activity_id', { completed_activity_id });
    }

    if (tag_id) {
      query.andWhere('tags.id = :tag_id', { tag_id });
    }

    const [notes, total] = await query.getManyAndCount();
    return [notes, total];
  }

  async searchUserNotes(query: string, userId: string, take: number): Promise<Note[]> {
    const result = await this.orm
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.tags', 'tags')
      .leftJoinAndSelect('note.embedded_todos', 'embedded_todos')
      .leftJoinAndSelect('note.completed_activity', 'completed_activity')
      .leftJoinAndSelect('completed_activity.activity', 'activity')
      .select([
        'note.id',
        'note.title',
        'note.body',
        'note.completed_activity_id',
        'note.created_at',
        'note.updated_at',
        'tags.id',
        'tags.text',
        'tags.color',
        'embedded_todos.id',
        'embedded_todos.title',
        'embedded_todos.status',
        'completed_activity.id',
        'completed_activity.start_time',
        'activity.id',
        'activity.activity_data',
      ])
      .where('note.user_id = :user_id', { user_id: userId })
      .getMany();

    if (!query) {
      return result.slice(0, take);
    }

    const lowerQuery = query.toLowerCase();
    return result
      .filter((note) => note.title?.toLowerCase().includes(lowerQuery) || note.body?.toLowerCase().includes(lowerQuery))
      .slice(0, take);
  }

  async getNoteById(noteId: string, userId: string): Promise<Note | null> {
    return this.orm
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.tags', 'tags')
      .leftJoinAndSelect('note.embedded_todos', 'embedded_todos')
      .leftJoinAndSelect('note.completed_activity', 'completed_activity')
      .leftJoinAndSelect('completed_activity.activity', 'activity')
      .where('note.id = :noteId', { noteId })
      .andWhere('note.user_id = :user_id', { user_id: userId })
      .getOne();
  }
}
