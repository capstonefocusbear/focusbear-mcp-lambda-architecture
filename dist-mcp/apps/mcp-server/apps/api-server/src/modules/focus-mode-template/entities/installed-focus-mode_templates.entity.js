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
exports.InstalledFocusModeTemplate = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const focus_mode_template_entity_1 = require("./focus-mode-template.entity");
let InstalledFocusModeTemplate = class InstalledFocusModeTemplate extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, installData = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, installData));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: false, type: () => String }, focus_mode_template_id: { required: false, type: () => String }, installation_status: { required: false, type: () => Boolean }, user: { required: false, type: () => require("../../user/entities/user.entity").User }, focus_mode_template: { required: false, type: () => require("./focus-mode-template.entity").FocusModeTemplate } };
    }
};
exports.InstalledFocusModeTemplate = InstalledFocusModeTemplate;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], InstalledFocusModeTemplate.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], InstalledFocusModeTemplate.prototype, "focus_mode_template_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], InstalledFocusModeTemplate.prototype, "installation_status", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.installed_focus_modes, { onDelete: 'SET NULL', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], InstalledFocusModeTemplate.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => focus_mode_template_entity_1.FocusModeTemplate, (focus_mode_template) => focus_mode_template.installs, {
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'focus_mode_template_id' }),
    __metadata("design:type", focus_mode_template_entity_1.FocusModeTemplate)
], InstalledFocusModeTemplate.prototype, "focus_mode_template", void 0);
exports.InstalledFocusModeTemplate = InstalledFocusModeTemplate = __decorate([
    (0, typeorm_1.Entity)('installed_focus_mode_templates'),
    __metadata("design:paramtypes", [Object, Object])
], InstalledFocusModeTemplate);
//# sourceMappingURL=installed-focus-mode_templates.entity.js.map