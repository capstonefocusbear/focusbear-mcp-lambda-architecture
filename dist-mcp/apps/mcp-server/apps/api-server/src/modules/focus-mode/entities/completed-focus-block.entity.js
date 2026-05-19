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
exports.CompletedFocusBlock = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const focus_mode_entity_1 = require("./focus-mode.entity");
const focus_mode_tags_1 = require("./focus-mode-tags");
const to_do_entity_1 = require("../../to-do/entities/to-do.entity");
let CompletedFocusBlock = class CompletedFocusBlock extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, data = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign(Object.assign({}, data), { is_finished: !!data.finish_time }));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: false, type: () => String }, focus_mode_id: { required: false, type: () => String }, start_time: { required: false, type: () => Date }, finish_time: { required: false, type: () => Date }, scheduled_finish_time: { required: false, type: () => Date }, intention: { required: false, type: () => String }, achievements: { required: false, type: () => String }, distractions: { required: false, type: () => String }, focus_duration_seconds: { required: false, type: () => Number }, metadata: { required: false, type: () => Object }, user: { required: false, type: () => require("../../user/entities/user.entity").User }, focus_mode: { required: false, type: () => require("./focus-mode.entity").FocusMode }, tags: { required: false, type: () => [require("./focus-mode-tags").FocusModeTag] }, to_dos: { required: false, type: () => [require("../../to-do/entities/to-do.entity").ToDo] } };
    }
};
exports.CompletedFocusBlock = CompletedFocusBlock;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], CompletedFocusBlock.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], CompletedFocusBlock.prototype, "focus_mode_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], CompletedFocusBlock.prototype, "start_time", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], CompletedFocusBlock.prototype, "finish_time", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], CompletedFocusBlock.prototype, "scheduled_finish_time", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 400,
        transformer: base_entity_entity_1.BaseEntity.encryptField('intention'),
    }),
    __metadata("design:type", String)
], CompletedFocusBlock.prototype, "intention", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 400,
        transformer: base_entity_entity_1.BaseEntity.encryptField('achievements'),
    }),
    __metadata("design:type", String)
], CompletedFocusBlock.prototype, "achievements", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 400,
        transformer: base_entity_entity_1.BaseEntity.encryptField('distractions'),
    }),
    __metadata("design:type", String)
], CompletedFocusBlock.prototype, "distractions", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        default: 0,
        nullable: false,
    }),
    __metadata("design:type", Number)
], CompletedFocusBlock.prototype, "focus_duration_seconds", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        transformer: base_entity_entity_1.BaseEntity.encryptJSONField('metadata'),
    }),
    __metadata("design:type", Object)
], CompletedFocusBlock.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.completed_focus_blocks, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], CompletedFocusBlock.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => focus_mode_entity_1.FocusMode, (mode) => mode.completed_logs, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'focus_mode_id' }),
    __metadata("design:type", focus_mode_entity_1.FocusMode)
], CompletedFocusBlock.prototype, "focus_mode", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => focus_mode_tags_1.FocusModeTag, { cascade: true, eager: true }),
    (0, typeorm_1.JoinTable)(),
    __metadata("design:type", Array)
], CompletedFocusBlock.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => to_do_entity_1.ToDo, { cascade: true, eager: true }),
    (0, typeorm_1.JoinTable)(),
    __metadata("design:type", Array)
], CompletedFocusBlock.prototype, "to_dos", void 0);
exports.CompletedFocusBlock = CompletedFocusBlock = __decorate([
    (0, typeorm_1.Entity)('completed_focus_blocks'),
    __metadata("design:paramtypes", [Object, Object])
], CompletedFocusBlock);
//# sourceMappingURL=completed-focus-block.entity.js.map