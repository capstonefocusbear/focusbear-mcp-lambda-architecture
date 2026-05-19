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
exports.TaskTimeLog = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const completed_focus_block_entity_1 = require("../../focus-mode/entities/completed-focus-block.entity");
const to_do_entity_1 = require("./to-do.entity");
const numeric_column_transformer_1 = require("../../../shared/transformers/numeric-column-transformer");
let TaskTimeLog = class TaskTimeLog extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, track = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, track));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: false, type: () => String }, completed_focus_block_id: { required: false, type: () => String }, task_id: { required: false, type: () => String }, duration_logged_seconds: { required: false, type: () => Number }, note: { required: false, type: () => String }, user: { required: false, type: () => require("../../user/entities/user.entity").User }, to_do: { required: false, type: () => require("./to-do.entity").ToDo }, completed_focus_block: { required: false, type: () => require("../../focus-mode/entities/completed-focus-block.entity").CompletedFocusBlock } };
    }
};
exports.TaskTimeLog = TaskTimeLog;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], TaskTimeLog.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
    }),
    __metadata("design:type", String)
], TaskTimeLog.prototype, "completed_focus_block_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
    }),
    __metadata("design:type", String)
], TaskTimeLog.prototype, "task_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'numeric',
        nullable: true,
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], TaskTimeLog.prototype, "duration_logged_seconds", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: true,
        transformer: base_entity_entity_1.BaseEntity.encryptField('note'),
    }),
    __metadata("design:type", String)
], TaskTimeLog.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.to_dos, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], TaskTimeLog.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => to_do_entity_1.ToDo, (toDo) => toDo.task_time_logs, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'task_id' }),
    __metadata("design:type", to_do_entity_1.ToDo)
], TaskTimeLog.prototype, "to_do", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => completed_focus_block_entity_1.CompletedFocusBlock, (completedFocusBlock) => completedFocusBlock.to_dos, {
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'completed_focus_block_id' }),
    __metadata("design:type", completed_focus_block_entity_1.CompletedFocusBlock)
], TaskTimeLog.prototype, "completed_focus_block", void 0);
exports.TaskTimeLog = TaskTimeLog = __decorate([
    (0, typeorm_1.Entity)('tasks_time_logs'),
    __metadata("design:paramtypes", [Object, Object])
], TaskTimeLog);
//# sourceMappingURL=tasks-time-logs.entity.js.map