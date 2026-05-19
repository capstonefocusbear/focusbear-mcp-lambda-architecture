"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivitySequenceRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const base_repository_repository_1 = require("../../../shared/repositories/base-repository.repository");
const activity_sequence_entity_1 = require("../entities/activity-sequence.entity");
let ActivitySequenceRepository = class ActivitySequenceRepository extends base_repository_repository_1.BaseRepository {
    constructor(connection) {
        super(connection, activity_sequence_entity_1.ActivitySequence);
        this.connection = connection;
    }
    async findOneByTypeForUser(type, user_id) {
        return this.orm.findOne({ where: { type, user_id } });
    }
    async findOneByIdForUser(id, user_id) {
        return this.orm.findOne({ where: { id, user_id } });
    }
    async countSequenceTotalDuration(activity_ids) {
        return this.orm
            .query(`
      SELECT SUM(duration_seconds) as total
      FROM "activities"
      WHERE id = ANY($1::uuid[])
      `, [activity_ids])
            .then(([{ total }]) => Number(total));
    }
    async findOneByTypeAndCustomRoutineForUser(type, user_id, custom_routine_id) {
        return this.orm.findOne({ where: { type, user_id, custom_routine_id } });
    }
};
exports.ActivitySequenceRepository = ActivitySequenceRepository;
exports.ActivitySequenceRepository = ActivitySequenceRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.Connection])
], ActivitySequenceRepository);
//# sourceMappingURL=activity-sequence.repository.js.map