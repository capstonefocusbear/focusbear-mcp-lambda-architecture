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
exports.FocusModeTemplate = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const focus_mode_entity_1 = require("../../focus-mode/entities/focus-mode.entity");
const marketplace_request_enum_1 = require("../../habit-pack/domain/marketplace-request.enum");
const user_entity_1 = require("../../user/entities/user.entity");
const installed_focus_mode_templates_entity_1 = require("./installed-focus-mode_templates.entity");
const focus_mode_tags_1 = require("../../focus-mode/entities/focus-mode-tags");
let FocusModeTemplate = class FocusModeTemplate extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, data = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, data));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { author_id: { required: false, type: () => String }, author_name: { required: false, type: () => String }, name: { required: false, type: () => String }, allowed_apps: { required: false, type: () => [String] }, allowed_urls: { required: false, type: () => [String] }, description: { required: false, type: () => String }, description_video_url: { required: false, type: () => String }, welcome_message: { required: false, type: () => String }, welcome_video_url: { required: false, type: () => String }, description_plain_text: { required: false, type: () => String }, welcome_message_plain_text: { required: false, type: () => String }, marketplace_approval_status: { required: false, type: () => Boolean }, marketplace_request: { required: false, enum: require("../../habit-pack/domain/marketplace-request.enum").MarketplaceRequestType }, is_featured: { required: false, type: () => Boolean }, featured_for_onboarding: { required: false, type: () => Boolean }, language: { required: false, type: () => String }, deleted_at: { required: false, type: () => Date }, author: { required: false, type: () => require("../../user/entities/user.entity").User }, installs: { required: false, type: () => [require("./installed-focus-mode_templates.entity").InstalledFocusModeTemplate] }, focus_modes: { required: false, type: () => [require("../../focus-mode/entities/focus-mode.entity").FocusMode] }, tags: { required: false, type: () => [require("../../focus-mode/entities/focus-mode-tags").FocusModeTag] } };
    }
};
exports.FocusModeTemplate = FocusModeTemplate;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], FocusModeTemplate.prototype, "author_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 255,
        nullable: false,
    }),
    __metadata("design:type", String)
], FocusModeTemplate.prototype, "author_name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 255,
        nullable: false,
    }),
    __metadata("design:type", String)
], FocusModeTemplate.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        transformer: base_entity_entity_1.BaseEntity.encryptJSONField('allowed_apps'),
    }),
    __metadata("design:type", Array)
], FocusModeTemplate.prototype, "allowed_apps", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        transformer: base_entity_entity_1.BaseEntity.encryptJSONField('allowed_urls'),
    }),
    __metadata("design:type", Array)
], FocusModeTemplate.prototype, "allowed_urls", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 2500,
    }),
    __metadata("design:type", String)
], FocusModeTemplate.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
    }),
    __metadata("design:type", String)
], FocusModeTemplate.prototype, "description_video_url", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 2500,
    }),
    __metadata("design:type", String)
], FocusModeTemplate.prototype, "welcome_message", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
    }),
    __metadata("design:type", String)
], FocusModeTemplate.prototype, "welcome_video_url", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        default: null,
    }),
    __metadata("design:type", String)
], FocusModeTemplate.prototype, "description_plain_text", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        default: null,
    }),
    __metadata("design:type", String)
], FocusModeTemplate.prototype, "welcome_message_plain_text", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], FocusModeTemplate.prototype, "marketplace_approval_status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: marketplace_request_enum_1.MarketplaceRequestType.unrequested,
    }),
    __metadata("design:type", String)
], FocusModeTemplate.prototype, "marketplace_request", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], FocusModeTemplate.prototype, "is_featured", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], FocusModeTemplate.prototype, "featured_for_onboarding", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
    }),
    __metadata("design:type", String)
], FocusModeTemplate.prototype, "language", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)(),
    __metadata("design:type", Date)
], FocusModeTemplate.prototype, "deleted_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.focus_mode_templates, { onDelete: 'SET NULL', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'author_id' }),
    __metadata("design:type", user_entity_1.User)
], FocusModeTemplate.prototype, "author", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => installed_focus_mode_templates_entity_1.InstalledFocusModeTemplate, (installed_focus_mode) => installed_focus_mode.focus_mode_template),
    __metadata("design:type", Array)
], FocusModeTemplate.prototype, "installs", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => focus_mode_entity_1.FocusMode, (focus_mode) => focus_mode.focus_mode_template),
    __metadata("design:type", Array)
], FocusModeTemplate.prototype, "focus_modes", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => focus_mode_tags_1.FocusModeTag, { cascade: true, eager: true }),
    (0, typeorm_1.JoinTable)(),
    __metadata("design:type", Array)
], FocusModeTemplate.prototype, "tags", void 0);
exports.FocusModeTemplate = FocusModeTemplate = __decorate([
    (0, typeorm_1.Entity)('focus_mode_templates'),
    __metadata("design:paramtypes", [Object, Object])
], FocusModeTemplate);
//# sourceMappingURL=focus-mode-template.entity.js.map