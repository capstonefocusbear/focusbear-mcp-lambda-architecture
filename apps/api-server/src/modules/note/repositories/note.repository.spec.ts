import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { NoteRepository } from './note.repository';
import { Note } from '../entities/note.entity';

const buildNote = (title: string, body = ''): Note =>
  ({
    id: randomUUID(),
    title,
    body,
    created_at: new Date().toISOString(),
  } as Note);

describe('NoteRepository', () => {
  const userId = randomUUID();

  const setupRepository = (batches: Note[][]) => {
    const ormMock = {
      createQueryBuilder: jest.fn().mockImplementation(() => {
        const state = { skip: 0, take: 0 };
        const qb = {
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          addOrderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockImplementation((value: number) => {
            state.skip = value;
            return qb;
          }),
          take: jest.fn().mockImplementation((value: number) => {
            state.take = value;
            return qb;
          }),
          getMany: jest.fn().mockImplementation(async () => {
            const batchSize = state.take || 100;
            const page = Math.floor(state.skip / batchSize);
            return batches[page] ?? [];
          }),
        };
        return qb;
      }),
    };

    const dataSourceMock = {
      getRepository: jest.fn().mockReturnValue(ormMock),
    } as unknown as DataSource;

    return {
      noteRepository: new NoteRepository(dataSourceMock),
      ormMock,
    };
  };

  it('searchUserNotes: should continue scanning beyond first 500-equivalent window and find older matches', async () => {
    const firstBatch = Array.from({ length: 100 }, (_, index) => buildNote(`note-${index}`, 'irrelevant'));
    const matchingNote = buildNote('older note title', 'contains needle');

    const { noteRepository, ormMock } = setupRepository([firstBatch, [matchingNote], []]);

    const result = await noteRepository.searchUserNotes('needle', userId, 1);

    expect(result).toEqual([matchingNote]);
    expect(ormMock.createQueryBuilder).toHaveBeenCalledTimes(2);
  });

  it('searchUserNotes: should return first take notes for empty query without unnecessary extra batches', async () => {
    const firstBatch = Array.from({ length: 100 }, (_, index) => buildNote(`note-${index}`));
    const secondBatch = Array.from({ length: 100 }, (_, index) => buildNote(`note-next-${index}`));

    const { noteRepository, ormMock } = setupRepository([firstBatch, secondBatch, []]);

    const result = await noteRepository.searchUserNotes(undefined, userId, 20);

    expect(result).toHaveLength(20);
    expect(result).toEqual(firstBatch.slice(0, 20));
    expect(ormMock.createQueryBuilder).toHaveBeenCalledTimes(1);
  });
});
