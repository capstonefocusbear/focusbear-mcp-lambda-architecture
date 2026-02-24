import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@app/observability';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  CompletedActivityRepositoryMock,
  NoteRepositoryMock,
  NoteTagRepositoryMock,
  SentryServiceMock,
  ToDoRepositoryMock,
} from '../../../../test/mocks';
import { NoteService } from './note.service';
import { NoteRepository } from '../repositories/note.repository';
import { NoteTagRepository } from '../repositories/note-tag.repository';
import { CompletedActivityRepository } from '../../activity/repositories/completed-activity.repository';
import { ToDoRepository } from '../../to-do/repositories/to-do.repository';
import { Note } from '../entities/note.entity';

describe('NoteService', () => {
  let noteService: NoteService;
  const userId = randomUUID();
  const anotherUserId = randomUUID();

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        NoteService,
        NoteRepository,
        NoteTagRepository,
        ToDoRepository,
        CompletedActivityRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(NoteRepository)
      .useValue(NoteRepositoryMock)
      .overrideProvider(NoteTagRepository)
      .useValue(NoteTagRepositoryMock)
      .overrideProvider(ToDoRepository)
      .useValue(ToDoRepositoryMock)
      .overrideProvider(CompletedActivityRepository)
      .useValue(CompletedActivityRepositoryMock)
      .compile();

    noteService = moduleRef.get<NoteService>(NoteService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const noteDummy = {
    title: 'Test Note Title',
    body: 'Some note content...',
  };

  describe('upsertNote', () => {
    it('positive: should create new note with user_id when no id provided', async () => {
      const savedNote = new Note({
        id: randomUUID(),
        user_id: userId,
        ...noteDummy,
        is_brain_dump: false,
        tags: [],
        embedded_todos: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      NoteRepositoryMock.orm.save.mockResolvedValueOnce(savedNote);
      NoteRepositoryMock.getNoteById.mockResolvedValueOnce(savedNote);

      const result = await noteService.upsertNote(userId, noteDummy);

      expect(NoteRepositoryMock.orm.save).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          title: noteDummy.title,
          body: noteDummy.body,
        }),
      );
      expect(result.title).toBe(noteDummy.title);
    });

    it('positive: should default is_brain_dump to false when omitted on create', async () => {
      const savedNote = new Note({
        id: randomUUID(),
        user_id: userId,
        ...noteDummy,
        is_brain_dump: false,
        tags: [],
        embedded_todos: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      NoteRepositoryMock.orm.save.mockResolvedValueOnce(savedNote);
      NoteRepositoryMock.getNoteById.mockResolvedValueOnce(savedNote);

      const result = await noteService.upsertNote(userId, noteDummy);

      expect(NoteRepositoryMock.orm.save).toHaveBeenCalledWith(
        expect.objectContaining({
          is_brain_dump: false,
        }),
      );
      expect(result.is_brain_dump).toBe(false);
    });

    it('positive: should persist is_brain_dump when provided on create', async () => {
      const savedNote = new Note({
        id: randomUUID(),
        user_id: userId,
        ...noteDummy,
        is_brain_dump: true,
        tags: [],
        embedded_todos: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      NoteRepositoryMock.orm.save.mockResolvedValueOnce(savedNote);
      NoteRepositoryMock.getNoteById.mockResolvedValueOnce(savedNote);

      const result = await noteService.upsertNote(userId, { ...noteDummy, is_brain_dump: true });

      expect(NoteRepositoryMock.orm.save).toHaveBeenCalledWith(
        expect.objectContaining({
          is_brain_dump: true,
        }),
      );
      expect(result.is_brain_dump).toBe(true);
    });

    it('positive: should allow user to update their own note', async () => {
      const noteId = randomUUID();
      const existingNote = new Note({
        id: noteId,
        user_id: userId,
        ...noteDummy,
        is_brain_dump: false,
        tags: [],
        embedded_todos: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const updatedNote = new Note({
        ...existingNote,
        title: 'Updated Title',
        tags: [],
        embedded_todos: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      NoteRepositoryMock.orm.findOne.mockResolvedValueOnce(existingNote);
      NoteRepositoryMock.getNoteById.mockResolvedValueOnce(existingNote);
      NoteRepositoryMock.orm.save.mockResolvedValueOnce(updatedNote);
      NoteRepositoryMock.getNoteById.mockResolvedValueOnce(updatedNote);

      const result = await noteService.upsertNote(userId, { id: noteId, title: 'Updated Title' });

      expect(NoteRepositoryMock.orm.save).toHaveBeenCalled();
      expect(result.title).toBe('Updated Title');
    });

    it('positive: should update is_brain_dump when explicitly provided on update', async () => {
      const noteId = randomUUID();
      const existingNote = new Note({
        id: noteId,
        user_id: userId,
        ...noteDummy,
        is_brain_dump: true,
        tags: [],
        embedded_todos: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const updatedNote = new Note({
        ...existingNote,
        is_brain_dump: false,
        updated_at: new Date().toISOString(),
      });

      NoteRepositoryMock.orm.findOne.mockResolvedValueOnce({ id: noteId, user_id: userId });
      NoteRepositoryMock.getNoteById.mockResolvedValueOnce(existingNote);
      NoteRepositoryMock.orm.save.mockResolvedValueOnce(updatedNote);
      NoteRepositoryMock.getNoteById.mockResolvedValueOnce(updatedNote);

      const result = await noteService.upsertNote(userId, { id: noteId, is_brain_dump: false });

      expect(NoteRepositoryMock.orm.save).toHaveBeenCalledWith(
        expect.objectContaining({
          is_brain_dump: false,
        }),
      );
      expect(result.is_brain_dump).toBe(false);
    });

    it('positive: should preserve tags and embedded todos when omitted in update payload', async () => {
      const noteId = randomUUID();
      const existingNote = new Note({
        id: noteId,
        user_id: userId,
        title: noteDummy.title,
        body: noteDummy.body,
        is_brain_dump: true,
        tags: [{ id: randomUUID(), text: 'keep-tag', color: '#808080' } as any],
        embedded_todos: [{ id: randomUUID(), title: 'keep-todo' } as any],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const updatedNote = new Note({
        ...existingNote,
        title: 'Updated Title',
        updated_at: new Date().toISOString(),
      });

      NoteRepositoryMock.orm.findOne.mockResolvedValueOnce({ id: noteId, user_id: userId });
      NoteRepositoryMock.getNoteById.mockResolvedValueOnce(existingNote);
      NoteRepositoryMock.orm.save.mockResolvedValueOnce(updatedNote);
      NoteRepositoryMock.getNoteById.mockResolvedValueOnce(updatedNote);

      await noteService.upsertNote(userId, { id: noteId, title: 'Updated Title' });

      expect(NoteRepositoryMock.orm.save).toHaveBeenCalledWith(
        expect.objectContaining({
          is_brain_dump: true,
          tags: existingNote.tags,
          embedded_todos: existingNote.embedded_todos,
        }),
      );
      expect(NoteTagRepositoryMock.findOrCreateTag).not.toHaveBeenCalled();
      expect(ToDoRepositoryMock.orm.find).not.toHaveBeenCalled();
    });

    it('negative: should throw UnauthorizedException when user tries to update another users note', async () => {
      const noteId = randomUUID();
      const existingNote = {
        id: noteId,
        user_id: anotherUserId,
        ...noteDummy,
      };

      NoteRepositoryMock.orm.findOne.mockResolvedValueOnce(existingNote);

      let exception;
      try {
        await noteService.upsertNote(userId, { id: noteId, ...noteDummy });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toContain('not allowed to edit note');
      expect(NoteRepositoryMock.orm.save).not.toHaveBeenCalled();
    });

    it('negative: should log security warning when unauthorized update is attempted', async () => {
      const noteId = randomUUID();
      const existingNote = {
        id: noteId,
        user_id: anotherUserId,
        ...noteDummy,
      };

      NoteRepositoryMock.orm.findOne.mockResolvedValueOnce(existingNote);

      try {
        await noteService.upsertNote(userId, { id: noteId, ...noteDummy });
      } catch (error) {
        // Expected to throw
      }

      expect(SentryServiceMock.instance().captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY: Unauthorized note update attempt'),
        'warning',
      );
    });

    it('negative: should throw NotFoundException when completed_activity_id does not belong to user', async () => {
      const completedActivityId = randomUUID();

      CompletedActivityRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      let exception;
      try {
        await noteService.upsertNote(userId, {
          ...noteDummy,
          completed_activity_id: completedActivityId,
        });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toContain('Completed activity');
      expect(NoteRepositoryMock.orm.save).not.toHaveBeenCalled();
    });

    it('negative: should throw BadRequestException when creating note without title', async () => {
      let exception;
      try {
        await noteService.upsertNote(userId, { body: noteDummy.body });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toContain('title is required');
      expect(NoteRepositoryMock.orm.save).not.toHaveBeenCalled();
    });

    it('positive: should always set user_id to authenticated user regardless of input', async () => {
      const maliciousNote = { ...noteDummy, user_id: anotherUserId };

      const savedNote = new Note({
        id: randomUUID(),
        user_id: userId,
        ...noteDummy,
        is_brain_dump: false,
        tags: [],
        embedded_todos: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      NoteRepositoryMock.orm.save.mockResolvedValueOnce(savedNote);
      NoteRepositoryMock.getNoteById.mockResolvedValueOnce(savedNote);

      await noteService.upsertNote(userId, maliciousNote as any);

      expect(NoteRepositoryMock.orm.save).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
        }),
      );
    });
  });

  describe('deleteNote', () => {
    it('positive: should delete users own note from DB', async () => {
      const noteId = randomUUID();
      const existingNote = {
        id: noteId,
        user_id: userId,
        ...noteDummy,
      };

      NoteRepositoryMock.orm.findOne.mockResolvedValueOnce(existingNote);
      NoteRepositoryMock.orm.delete.mockResolvedValueOnce({ affected: 1, raw: [] });

      await noteService.deleteNote(userId, noteId);

      expect(NoteRepositoryMock.orm.delete).toHaveBeenCalledWith({ user_id: userId, id: noteId });
    });

    it('negative: should throw UnauthorizedException when user tries to delete another users note', async () => {
      const noteId = randomUUID();
      const existingNote = {
        id: noteId,
        user_id: anotherUserId,
        ...noteDummy,
      };

      NoteRepositoryMock.orm.findOne.mockResolvedValueOnce(existingNote);

      let exception;
      try {
        await noteService.deleteNote(userId, noteId);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toContain('not allowed to delete note');
      expect(NoteRepositoryMock.orm.delete).not.toHaveBeenCalled();
    });

    it('negative: should log security warning when unauthorized deletion is attempted', async () => {
      const noteId = randomUUID();
      const existingNote = {
        id: noteId,
        user_id: anotherUserId,
        ...noteDummy,
      };

      NoteRepositoryMock.orm.findOne.mockResolvedValueOnce(existingNote);

      try {
        await noteService.deleteNote(userId, noteId);
      } catch (error) {
        // Expected to throw
      }

      expect(SentryServiceMock.instance().captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY: Unauthorized note deletion attempt'),
        'warning',
      );
    });

    it('negative: should throw NotFoundException when note does not exist', async () => {
      const noteId = randomUUID();
      NoteRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      let exception;
      try {
        await noteService.deleteNote(userId, noteId);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toContain('not found');
      expect(NoteRepositoryMock.orm.delete).not.toHaveBeenCalled();
    });
  });

  describe('getNoteById', () => {
    it('positive: should return note when user owns it', async () => {
      const noteId = randomUUID();
      const existingNote = new Note({
        id: noteId,
        user_id: userId,
        ...noteDummy,
        is_brain_dump: true,
        tags: [],
        embedded_todos: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      NoteRepositoryMock.getNoteById.mockResolvedValueOnce(existingNote);

      const result = await noteService.getNoteById(userId, noteId);

      expect(result.id).toBe(noteId);
      expect(result.title).toBe(noteDummy.title);
      expect(result.is_brain_dump).toBe(true);
    });

    it('negative: should throw NotFoundException when note does not exist', async () => {
      const noteId = randomUUID();
      NoteRepositoryMock.getNoteById.mockResolvedValueOnce(null);

      let exception;
      try {
        await noteService.getNoteById(userId, noteId);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toContain('not found');
    });
  });
});
