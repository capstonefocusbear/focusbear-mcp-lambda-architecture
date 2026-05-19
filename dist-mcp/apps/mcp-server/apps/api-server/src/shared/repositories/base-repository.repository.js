"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
class BaseRepository {
    constructor(dataSource, Entity) {
        this.orm = dataSource.getRepository(Entity);
        this.Entity = Entity;
    }
    async create(item) {
        return this.orm
            .createQueryBuilder()
            .insert()
            .into(this.Entity)
            .values([item])
            .returning('*')
            .execute()
            .then(({ raw: [{ id }] }) => this.orm.findOneBy({ id }));
    }
    async update(id, values) {
        const updateResult = await this.orm
            .createQueryBuilder()
            .update(this.Entity)
            .set(values)
            .where('id = :id', { id })
            .returning('*')
            .execute();
        if (updateResult.raw && updateResult.raw.length > 0) {
            const item_id = updateResult.raw[0].id;
            return this.orm.findOneBy({ id: item_id });
        }
        console.info(`No record was updated! ID: ${id}, Entity: ${this.Entity}, Values: ${JSON.stringify(values)}`);
    }
    async upsert(item, conflictTarget) {
        const keys = Object.keys(item);
        const keysForUpdate = keys.filter((e) => ![...conflictTarget, 'id'].includes(e));
        return this.orm
            .createQueryBuilder()
            .insert()
            .into(this.Entity)
            .values([item])
            .orUpdate(keysForUpdate, conflictTarget)
            .returning('*')
            .execute()
            .then(({ raw: [{ id }] }) => this.orm.findOneBy({ id }));
    }
}
exports.BaseRepository = BaseRepository;
//# sourceMappingURL=base-repository.repository.js.map