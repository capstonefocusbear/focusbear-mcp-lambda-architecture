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
exports.HabitLibraryRequest = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
let HabitLibraryRequest = class HabitLibraryRequest extends base_entity_entity_1.BaseEntity {
    constructor(partial = {}, options = { generateId: true }) {
        super(partial === null || partial === void 0 ? void 0 : partial.id, options);
        Object.assign(this, partial);
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: false, type: () => String, nullable: true }, goal: { required: true, type: () => String }, habit_name: { required: true, type: () => String }, habit_description: { required: false, type: () => String, nullable: true }, routine_type: { required: false, type: () => String, nullable: true }, duration_minutes: { required: false, type: () => Number, nullable: true }, justification: { required: false, type: () => String, nullable: true }, request_metadata: { required: false, type: () => Object, nullable: true }, user: { required: false, type: () => require("../../user/entities/user.entity").User, nullable: true } };
    }
};
exports.HabitLibraryRequest = HabitLibraryRequest;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], HabitLibraryRequest.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], HabitLibraryRequest.prototype, "goal", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], HabitLibraryRequest.prototype, "habit_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], HabitLibraryRequest.prototype, "habit_description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], HabitLibraryRequest.prototype, "routine_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    __metadata("design:type", Number)
], HabitLibraryRequest.prototype, "duration_minutes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], HabitLibraryRequest.prototype, "justification", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], HabitLibraryRequest.prototype, "request_metadata", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], HabitLibraryRequest.prototype, "user", void 0);
exports.HabitLibraryRequest = HabitLibraryRequest = __decorate([
    (0, typeorm_1.Entity)('habit_library_requests'),
    __metadata("design:paramtypes", [Object, Object])
], HabitLibraryRequest);
//# sourceMappingURL=habit-library-request.entity.js.map