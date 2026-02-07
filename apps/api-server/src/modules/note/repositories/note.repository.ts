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

  async searchUserNotes(query: string | undefined, userId: string, take: number): Promise<Note[]> {
    const normalizedQuery = query?.trim().toLowerCase();
    const safeTake = take || 20;
    const batchSize = Math.max(safeTake, 100);
    const scanNotesBatch = async (skip: number, matchedNotes: Note[]): Promise<Note[]> => {
      if (matchedNotes.length >= safeTake) {
        return matchedNotes;
      }

      const batch = await this.orm
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
        .orderBy('note.created_at', 'DESC')
        .addOrderBy('note.id', 'DESC')
        .skip(skip)
        .take(batchSize)
        .getMany();

      if (!batch.length) {
        return matchedNotes;
      }

      if (!normalizedQuery) {
        matchedNotes.push(...batch);
      } else {
        for (const note of batch) {
          if (
            note.title?.toLowerCase().includes(normalizedQuery) ||
            note.body?.toLowerCase().includes(normalizedQuery)
          ) {
            matchedNotes.push(note);
            if (matchedNotes.length >= safeTake) {
              break;
            }
          }
        }
      }

      if (matchedNotes.length >= safeTake) {
        return matchedNotes;
      }

      if (batch.length < batchSize) {
        return matchedNotes;
      }

      return scanNotesBatch(skip + batchSize, matchedNotes);
    };

    const matchedNotes = await scanNotesBatch(0, []);

    return matchedNotes.slice(0, safeTake);
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
