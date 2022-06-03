import { Connection, EntityTarget, Repository, UpdateResult } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

export const createBaseRepository = <T>(Entity: EntityTarget<T> | any) =>
  class BaseRepository {
    constructor(connection: Connection) {
      this.orm = connection.getRepository<T>(Entity);
    }

    readonly orm: Repository<T>;

    async create(item: T): Promise<T> {
      return this.orm
        .createQueryBuilder()
        .insert()
        .into(Entity)
        .values([item])
        .returning('*')
        .execute()
        .then(({ raw: [{ id }] }: UpdateResult) => this.orm.findOne(id));
    }

    async update(id: string, values: QueryDeepPartialEntity<T>): Promise<T> {
      return this.orm
        .createQueryBuilder()
        .update(Entity)
        .set(values)
        .where('id = :id', { id })
        .returning('*')
        .execute()
        .then(({ raw: [{ id: item_id }] }: UpdateResult) => this.orm.findOne(item_id));
    }

    async upsert(item: T, conflictTarget: string[]): Promise<T> {
      const keys = Object.keys(item);
      const keysForUpdate = keys.filter((e) => ![...conflictTarget, 'id'].includes(e));
      return this.orm
        .createQueryBuilder()
        .insert()
        .into(Entity)
        .values([item])
        .orUpdate({ conflict_target: conflictTarget, overwrite: keysForUpdate })
        .returning('*')
        .execute()
        .then(({ raw: [{ id }] }: UpdateResult) => this.orm.findOne(id));
    }
  };
