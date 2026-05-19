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
exports.ToDo = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const to_do_status_enum_1 = require("../domain/to-do-status.enum");
const user_entity_1 = require("../../user/entities/user.entity");
const focus_mode_entity_1 = require("../../focus-mode/entities/focus-mode.entity");
const focus_mode_tags_1 = require("../../focus-mode/entities/focus-mode-tags");
const completed_focus_block_entity_1 = require("../../focus-mode/entities/completed-focus-block.entity");
const tasks_time_logs_entity_1 = require("./tasks-time-logs.entity");
const synced_project_entity_1 = require("./synced-project.entity");
const project_entity_1 = require("../../project/entities/project.entity");
let ToDo = class ToDo extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, track = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, track));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: false, type: () => String }, focus_type: { required: false, type: () => String }, synced_project_id: { required: false, type: () => String }, project_id: { required: false, type: () => String }, assignee_id: { required: false, type: () => String }, assigned_mcp_token_id: { required: false, type: () => String }, custom_status_id: { required: false, type: () => String }, title: { required: true, type: () => String }, details: { required: true, type: () => String }, objective: { required: true, type: () => String }, external_task_id: { required: false, type: () => String }, external_task_metadata: { required: false, type: () => Object }, subtasks: { required: false, type: () => [require("../dto/subtask.dto").SubtaskDto] }, due_date: { required: false, type: () => Date }, eisenhower_quadrant: { required: true, type: () => Number }, outcome: { required: true, type: () => Number }, perspiration_level: { required: true, type: () => Number }, status: { required: true, type: () => String }, duration: { required: false, type: () => Number }, icon: { required: false, type: () => String }, user: { required: false, type: () => require("../../user/entities/user.entity").User }, synced_project: { required: false, type: () => require("./synced-project.entity").SyncedProject }, project: { required: false, type: () => require("../../project/entities/project.entity").Project }, assignee: { required: false, type: () => require("../../user/entities/user.entity").User }, focus_mode: { required: false, type: () => require("../../focus-mode/entities/focus-mode.entity").FocusMode }, task_time_logs: { required: false, type: () => [require("./tasks-time-logs.entity").TaskTimeLog] }, tags: { required: false, type: () => [require("../../focus-mode/entities/focus-mode-tags").FocusModeTag] }, completedFocusBlocks: { required: true, type: () => [require("../../focus-mode/entities/completed-focus-block.entity").CompletedFocusBlock] } };
    }
};
exports.ToDo = ToDo;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], ToDo.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
    }),
    __metadata("design:type", String)
], ToDo.prototype, "focus_type", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
    }),
    __metadata("design:type", String)
], ToDo.prototype, "synced_project_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
    }),
    __metadata("design:type", String)
], ToDo.prototype, "project_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
    }),
    __metadata("design:type", String)
], ToDo.prototype, "assignee_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
    }),
    __metadata("design:type", String)
], ToDo.prototype, "assigned_mcp_token_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 100,
        nullable: true,
    }),
    __metadata("design:type", String)
], ToDo.prototype, "custom_status_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 10000,
        default: null,
        nullable: true,
        transformer: base_entity_entity_1.BaseEntity.encryptField('title'),
    }),
    __metadata("design:type", String)
], ToDo.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 32000,
        default: null,
        nullable: true,
        transformer: base_entity_entity_1.BaseEntity.encryptField('details'),
    }),
    __metadata("design:type", String)
], ToDo.prototype, "details", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 32000,
        default: null,
        nullable: true,
        transformer: base_entity_entity_1.BaseEntity.encryptField('objective'),
    }),
    __metadata("design:type", String)
], ToDo.prototype, "objective", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: null, nullable: true }),
    __metadata("design:type", String)
], ToDo.prototype, "external_task_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: null, nullable: true, select: false }),
    __metadata("design:type", Object)
], ToDo.prototype, "external_task_metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: null, nullable: true }),
    __metadata("design:type", Array)
], ToDo.prototype, "subtasks", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', default: null, nullable: true }),
    __metadata("design:type", Date)
], ToDo.prototype, "due_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'smallint', default: 1, nullable: true }),
    __metadata("design:type", Number)
], ToDo.prototype, "eisenhower_quadrant", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'smallint', default: 1, nullable: true }),
    __metadata("design:type", Number)
], ToDo.prototype, "outcome", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'smallint', default: 1, nullable: true }),
    __metadata("design:type", Number)
], ToDo.prototype, "perspiration_level", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: to_do_status_enum_1.ToDoStatus.NOT_STARTED }),
    __metadata("design:type", String)
], ToDo.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'int',
        default: 0,
    }),
    __metadata("design:type", Number)
], ToDo.prototype, "duration", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        default: null,
    }),
    __metadata("design:type", String)
], ToDo.prototype, "icon", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.to_dos, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], ToDo.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => synced_project_entity_1.SyncedProject, (syncedProject) => syncedProject.to_dos, {
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'synced_project_id' }),
    __metadata("design:type", synced_project_entity_1.SyncedProject)
], ToDo.prototype, "synced_project", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.Project, (project) => project.tasks, {
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'project_id' }),
    __metadata("design:type", project_entity_1.Project)
], ToDo.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'assignee_id' }),
    __metadata("design:type", user_entity_1.User)
], ToDo.prototype, "assignee", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => focus_mode_entity_1.FocusMode, (focus_mode) => focus_mode.to_dos, { onDelete: 'SET NULL', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'focus_type' }),
    __metadata("design:type", focus_mode_entity_1.FocusMode)
], ToDo.prototype, "focus_mode", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => tasks_time_logs_entity_1.TaskTimeLog, (timeLog) => timeLog.to_do),
    __metadata("design:type", Array)
], ToDo.prototype, "task_time_logs", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => focus_mode_tags_1.FocusModeTag, { cascade: true, eager: true }),
    (0, typeorm_1.JoinTable)(),
    __metadata("design:type", Array)
], ToDo.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => completed_focus_block_entity_1.CompletedFocusBlock, (completedFocusBlock) => completedFocusBlock.to_dos),
    __metadata("design:type", Array)
], ToDo.prototype, "completedFocusBlocks", void 0);
exports.ToDo = ToDo = __decorate([
    (0, typeorm_1.Entity)('to_do'),
    __metadata("design:paramtypes", [Object, Object])
], ToDo);
//# sourceMappingURL=to-do.entity.js.map