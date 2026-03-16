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

  describe('getUserSequencePointerReset', () => {
    it('clears last_completed_sequence_id when it points to a deleted sequence', () => {
      const result = repository.getUserSequencePointerReset(
        {
          current_activity_sequence_id: 'seq-1',
          current_activity_id: 'activity-1',
          current_completing_sequence_log_id: 'log-1',
          last_completed_sequence_id: 'seq-2',
        },
        ['seq-2'],
      );

      expect(result).toEqual({
        last_completed_sequence_id: null,
      });
    });

    it('clears current sequence pointers when the active sequence is deleted', () => {
      const result = repository.getUserSequencePointerReset(
        {
          current_activity_sequence_id: 'seq-1',
          current_activity_id: 'activity-1',
          current_completing_sequence_log_id: 'log-1',
          last_completed_sequence_id: 'seq-2',
        },
        ['seq-1'],
      );

      expect(result).toEqual({
        current_activity_sequence_id: null,
        current_activity_id: null,
        current_completing_sequence_log_id: null,
      });
    });
  });
});
