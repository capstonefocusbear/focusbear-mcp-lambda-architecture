import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@app/observability';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  NoteRepositoryMock,
  NoteTagRepositoryMock,
  SentryServiceMock,
  ToDoRepositoryMock,
} from '../../../../test/mocks';
import { NoteService } from './note.service';
import { NoteRepository } from '../repositories/note.repository';
import { NoteTagRepository } from '../repositories/note-tag.repository';
import { ToDoRepository } from '../../to-do/repositories/to-do.repository';
import { Note } from '../entities/note.entity';

describe('NoteService', () => {
  let noteService: NoteService;
  const userId = randomUUID();
  const anotherUserId = randomUUID();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        NoteService,
        NoteRepository,
        NoteTagRepository,
        ToDoRepository,
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

    it('positive: should allow user to update their own note', async () => {
      const noteId = randomUUID();
      const existingNote = {
        id: noteId,
        user_id: userId,
        ...noteDummy,
      };

      const updatedNote = new Note({
        ...existingNote,
        title: 'Updated Title',
        tags: [],
        embedded_todos: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      NoteRepositoryMock.orm.findOne.mockResolvedValueOnce(existingNote);
      NoteRepositoryMock.orm.save.mockResolvedValueOnce(updatedNote);
      NoteRepositoryMock.getNoteById.mockResolvedValueOnce(updatedNote);

      const result = await noteService.upsertNote(userId, { id: noteId, title: 'Updated Title' });

      expect(NoteRepositoryMock.orm.save).toHaveBeenCalled();
      expect(result.title).toBe('Updated Title');
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

    it('positive: should always set user_id to authenticated user regardless of input', async () => {
      const maliciousNote = { ...noteDummy, user_id: anotherUserId };

      const savedNote = new Note({
        id: randomUUID(),
        user_id: userId,
        ...noteDummy,
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
        tags: [],
        embedded_todos: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      NoteRepositoryMock.getNoteById.mockResolvedValueOnce(existingNote);

      const result = await noteService.getNoteById(userId, noteId);

      expect(result.id).toBe(noteId);
      expect(result.title).toBe(noteDummy.title);
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
