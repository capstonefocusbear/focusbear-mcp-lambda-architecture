import { DataSource } from 'typeorm';
import { UserRepository } from './user.repository';

describe('UserRepository', () => {
  let repository: UserRepository;

  beforeEach(() => {
    const dataSourceMock = {
      getRepository: jest.fn().mockReturnValue({}),
    } as unknown as DataSource;

    repository = new UserRepository(dataSourceMock);
  });

  describe('dedupeForUpsert', () => {
    it('keeps the last occurrence for duplicated ids', () => {
      const items = [
        { id: 'seq-1', name: 'first' },
        { id: 'seq-2', name: 'second' },
        { id: 'seq-1', name: 'latest' },
      ];

      const result = repository.dedupeForUpsert(items);

      expect(result).toEqual([
        { id: 'seq-2', name: 'second' },
        { id: 'seq-1', name: 'latest' },
      ]);
    });

    it('preserves items without ids while deduping identified rows', () => {
      const items = [
        { id: 'seq-1', name: 'first' },
        { name: 'no-id-1' },
        { id: 'seq-1', name: 'latest' },
        { name: 'no-id-2' },
      ];

      const result = repository.dedupeForUpsert(items);

      expect(result).toEqual([{ name: 'no-id-1' }, { id: 'seq-1', name: 'latest' }, { name: 'no-id-2' }]);
    });
  });
});
