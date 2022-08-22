import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { BaseRepository } from '../repositories/base-repository.repository';

export class BaseCRUDService<R extends BaseRepository<E>, E> {
  private readonly repository: R;

  constructor(repository: R) {
    this.repository = repository;
  }

  async create<T extends E>(createDto: T): Promise<E> {
    return this.repository.create(createDto);
  }

  async update<T extends QueryDeepPartialEntity<E>>(id: string, updateDto: T): Promise<E> {
    return this.repository.update(id, updateDto);
  }

  async delete(id: string[] | string): Promise<void> {
    await this.repository.orm.delete(id);
  }

  async softDelete(id: string[] | string): Promise<void> {
    await this.repository.orm.softDelete(id);
  }
}
