import { Connection, EntityTarget, Repository, UpdateResult, FindOptionsWhere } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

export class BaseRepository<T> {
  constructor(connection: Connection, Entity: EntityTarget<T> | any) {
    this.orm = connection.getRepository<T>(Entity);
    this.Entity = Entity;
  }

  readonly Entity: EntityTarget<T> | any;

  readonly orm: Repository<T>;

  async create(item: T): Promise<T> {
    return this.orm
      .createQueryBuilder()
      .insert()
      .into(this.Entity)
      .values([item])
      .returning('*')
      .execute()
      .then(({ raw: [{ id }] }: UpdateResult) => this.orm.findOneBy({ id } as FindOptionsWhere<T>));
  }

  async update(id: string, values: QueryDeepPartialEntity<T>): Promise<T> {
    return this.orm
      .createQueryBuilder()
      .update(this.Entity)
      .set(values)
      .where('id = :id', { id })
      .returning('*')
      .execute()
      .then(({ raw: [{ id: item_id }] }: UpdateResult) => this.orm.findOneBy({ id: item_id } as FindOptionsWhere<T>));
  }

  async upsert(item: T, conflictTarget: string[]): Promise<T> {
    const keys = Object.keys(item);
    const keysForUpdate = keys.filter((e) => ![...conflictTarget, 'id'].includes(e));
    return this.orm
      .createQueryBuilder()
      .insert()
      .into(this.Entity)
      .values([item])
      .orUpdate({ conflict_target: conflictTarget, overwrite: keysForUpdate })
      .returning('*')
      .execute()
      .then(({ raw: [{ id }] }: UpdateResult) => this.orm.findOneBy({ id } as FindOptionsWhere<T>));
  }
}
