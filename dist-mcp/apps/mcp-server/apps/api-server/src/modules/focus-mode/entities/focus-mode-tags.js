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
exports.FocusModeTag = void 0;
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const focus_mode_entity_1 = require("./focus-mode.entity");
const focus_mode_template_entity_1 = require("../../focus-mode-template/entities/focus-mode-template.entity");
const completed_focus_block_entity_1 = require("./completed-focus-block.entity");
const to_do_entity_1 = require("../../to-do/entities/to-do.entity");
let FocusModeTag = class FocusModeTag extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, data = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, data));
    }
};
exports.FocusModeTag = FocusModeTag;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], FocusModeTag.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: null }),
    __metadata("design:type", String)
], FocusModeTag.prototype, "text", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: null, nullable: true }),
    __metadata("design:type", String)
], FocusModeTag.prototype, "external_project_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: null, nullable: true }),
    __metadata("design:type", Object)
], FocusModeTag.prototype, "external_project_metadata", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.focus_modes, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], FocusModeTag.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => focus_mode_entity_1.FocusMode, (focusMode) => focusMode.tags),
    __metadata("design:type", Array)
], FocusModeTag.prototype, "focusModes", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => focus_mode_template_entity_1.FocusModeTemplate, (focusModeTemplate) => focusModeTemplate.tags),
    __metadata("design:type", Array)
], FocusModeTag.prototype, "focusModeTemplates", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => completed_focus_block_entity_1.CompletedFocusBlock, (completedFocusBlock) => completedFocusBlock.tags),
    __metadata("design:type", Array)
], FocusModeTag.prototype, "completedFocusBlocks", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => to_do_entity_1.ToDo, (toDo) => toDo.tags),
    __metadata("design:type", Array)
], FocusModeTag.prototype, "toDos", void 0);
exports.FocusModeTag = FocusModeTag = __decorate([
    (0, typeorm_1.Entity)('focus_mode_tags'),
    __metadata("design:paramtypes", [Object, Object])
], FocusModeTag);
//# sourceMappingURL=focus-mode-tags.js.map