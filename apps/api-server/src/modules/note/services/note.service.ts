import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { In } from 'typeorm';
import { InjectSentry, SentryService } from '@app/observability';
import { NoteRepository } from '../repositories/note.repository';
import { NoteTagRepository } from '../repositories/note-tag.repository';
import { CreateNoteDto } from '../dto/create-note.dto';
import { GetNotesQueryDto } from '../dto/get-notes-query.dto';
import { SearchNotesDto } from '../dto/search-notes.dto';
import { Note } from '../entities/note.entity';
import { NoteTag } from '../entities/note-tag.entity';
import { NoteResponseDto } from '../dto/note-response.dto';
import { PaginationDto } from '../../../shared/pagination/index.dto';
import { PaginationMetaDto } from '../../../shared/pagination/pagination-meta.dto';
import { ToDoRepository } from '../../to-do/repositories/to-do.repository';

@Injectable()
export class NoteService {
  constructor(
    private readonly noteRepository: NoteRepository,
    private readonly noteTagRepository: NoteTagRepository,
    private readonly toDoRepository: ToDoRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  private mapNoteToResponse(note: Note): NoteResponseDto {
    const activityData = note.completed_activity?.activity?.activity_data;
    return {
      id: note.id,
      title: note.title,
      body: note.body,
      completed_activity_id: note.completed_activity_id,
      tags: note.tags,
      embedded_todo_ids: note.embedded_todos?.map((todo) => todo.id) || [],
      activity_name: activityData?.name,
      activity_emoji: activityData?.habit_icon,
      logged_at: note.completed_activity?.start_time?.toISOString(),
      created_at: note.created_at,
      updated_at: note.updated_at,
    };
  }

  async upsertNote(userId: string, createNoteDto: CreateNoteDto): Promise<NoteResponseDto> {
    if (createNoteDto.id) {
      const existingNote = await this.noteRepository.orm.findOne({ where: { id: createNoteDto.id } });
      if (existingNote && existingNote.user_id !== userId) {
        this.sentryService
          .instance()
          .captureMessage(
            `SECURITY: Unauthorized note update attempt - User ${userId} tried to update note ${existingNote.id} owned by ${existingNote.user_id}`,
            'warning',
          );
        throw new UnauthorizedException(
          `User with ID: ${userId} is not allowed to edit note with ID: ${existingNote.id}!`,
        );
      }
    }

    const tags = await this.processNoteTags(userId, createNoteDto.tags);

    let embeddedTodos = [];
    if (createNoteDto.embedded_todo_ids?.length) {
      embeddedTodos = await this.toDoRepository.orm.find({
        where: {
          id: In(createNoteDto.embedded_todo_ids),
          user_id: userId,
        },
      });
    }

    const note = new Note(
      {
        ...createNoteDto,
        user_id: userId,
        updated_at: new Date().toISOString(),
        tags,
        embedded_todos: embeddedTodos,
      },
      { generateId: !createNoteDto.id },
    );

    const savedNote = await this.noteRepository.orm.save(note);
    const fullNote = await this.noteRepository.getNoteById(savedNote.id, userId);
    return this.mapNoteToResponse(fullNote);
  }

  async getNotes(userId: string, queryDto: GetNotesQueryDto): Promise<PaginationDto<NoteResponseDto>> {
    const [notes, total] = await this.noteRepository.getUserNotes(userId, queryDto);

    const mappedNotes = notes.map((note) => this.mapNoteToResponse(note));

    return new PaginationDto(
      mappedNotes,
      new PaginationMetaDto({
        paginationOptionsDto: {
          page: queryDto.page,
          order: queryDto.order,
          skip: queryDto.skip,
          take: queryDto.take,
        },
        itemCount: total,
      }),
    );
  }

  async getNoteById(userId: string, noteId: string): Promise<NoteResponseDto> {
    const note = await this.noteRepository.getNoteById(noteId, userId);
    if (!note) {
      throw new NotFoundException(`Note with ID: ${noteId} not found!`);
    }
    return this.mapNoteToResponse(note);
  }

  async deleteNote(userId: string, noteId: string): Promise<void> {
    const existingNote = await this.noteRepository.orm.findOne({ where: { id: noteId } });

    if (!existingNote) {
      throw new NotFoundException(`Note with ID: ${noteId} not found!`);
    }

    if (existingNote.user_id !== userId) {
      this.sentryService
        .instance()
        .captureMessage(
          `SECURITY: Unauthorized note deletion attempt - User ${userId} tried to delete note ${noteId} owned by ${existingNote.user_id}`,
          'warning',
        );
      throw new UnauthorizedException(`User with ID: ${userId} is not allowed to delete note with ID: ${noteId}!`);
    }

    await this.noteRepository.orm.delete({ user_id: userId, id: noteId });

    this.sentryService.instance().addBreadcrumb({
      category: 'note',
      message: `User ${userId} deleted note ${noteId}`,
      level: 'info',
    });
  }

  async searchNotes(userId: string, searchDto: SearchNotesDto): Promise<NoteResponseDto[]> {
    const notes = await this.noteRepository.searchUserNotes(searchDto.query, userId, searchDto.take);
    return notes.map((note) => this.mapNoteToResponse(note));
  }

  async getUserTags(userId: string): Promise<NoteTag[]> {
    return this.noteTagRepository.getUserTags(userId);
  }

  private async processNoteTags(
    userId: string,
    tagDtos?: { id?: string; text: string; color?: string }[],
  ): Promise<NoteTag[]> {
    if (!tagDtos?.length) {
      return [];
    }

    const tagIds = tagDtos.filter((t) => t.id).map((t) => t.id);
    const existingTagsById = tagIds.length
      ? await this.noteTagRepository.orm.find({
          where: { id: In(tagIds), user_id: userId },
        })
      : [];
    const existingTagMap = new Map(existingTagsById.map((t) => [t.id, t]));

    const tagsToCreate = tagDtos.filter((t) => !t.id || !existingTagMap.has(t.id));
    const createdTags = await Promise.all(
      tagsToCreate.map((tagDto) => this.noteTagRepository.findOrCreateTag(userId, tagDto.text, tagDto.color)),
    );

    const tags: NoteTag[] = [];
    let createdIndex = 0;
    for (const tagDto of tagDtos) {
      if (tagDto.id && existingTagMap.has(tagDto.id)) {
        tags.push(existingTagMap.get(tagDto.id));
      } else {
        tags.push(createdTags[createdIndex]);
        createdIndex += 1;
      }
    }

    return tags;
  }
}
