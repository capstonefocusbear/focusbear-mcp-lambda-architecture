import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { User } from './user.entity';

describe('User entity metadata', () => {
  const storage = getMetadataArgsStorage();

  it.each(['current_activity_id', 'current_activity_sequence_id', 'last_completed_sequence_id'])(
    'marks %s as a nullable FK column',
    (propertyName) => {
      const column = storage.columns.find((item) => item.target === User && item.propertyName === propertyName);

      expect(column).toBeDefined();
      expect(column.options.nullable).toBe(true);
    },
  );

  it.each(['current_activity', 'current_activity_sequence', 'last_completed_sequence'])(
    'keeps %s as a nullable SET NULL relation',
    (propertyName) => {
      const relation = storage.relations.find((item) => item.target === User && item.propertyName === propertyName);

      expect(relation).toBeDefined();
      expect(relation.options.nullable).toBe(true);
      expect(relation.options.onDelete).toBe('SET NULL');
    },
  );
});
