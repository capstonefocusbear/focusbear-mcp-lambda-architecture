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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncedProject = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const to_do_entity_1 = require("./to-do.entity");
let SyncedProject = class SyncedProject extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, track = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, track));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: false, type: () => String }, platform: { required: false, type: () => String }, external_project_id: { required: false, type: () => String }, external_portal_id: { required: false, type: () => String }, available_statuses: { required: false, type: () => [require("../domain/external-task-status.model").ExternalTaskStatus] }, have_tasks_been_synced: { required: false, type: () => Boolean }, user: { required: false, type: () => require("../../user/entities/user.entity").User }, to_dos: { required: false, type: () => [require("./to-do.entity").ToDo] }, synced_at: { required: true, type: () => Date } };
    }
};
exports.SyncedProject = SyncedProject;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], SyncedProject.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: true,
    }),
    __metadata("design:type", String)
], SyncedProject.prototype, "platform", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: true,
    }),
    __metadata("design:type", String)
], SyncedProject.prototype, "external_project_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: true,
    }),
    __metadata("design:type", String)
], SyncedProject.prototype, "external_portal_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: null, nullable: true }),
    __metadata("design:type", Array)
], SyncedProject.prototype, "available_statuses", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], SyncedProject.prototype, "have_tasks_been_synced", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.to_dos, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], SyncedProject.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => to_do_entity_1.ToDo, (toDo) => toDo.synced_project),
    __metadata("design:type", Array)
], SyncedProject.prototype, "to_dos", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], SyncedProject.prototype, "synced_at", void 0);
exports.SyncedProject = SyncedProject = __decorate([
    (0, typeorm_1.Entity)('synced_projects'),
    __metadata("design:paramtypes", [Object, Object])
], SyncedProject);
//# sourceMappingURL=synced-project.entity.js.map