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
exports.HabitPack = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const numeric_column_transformer_1 = require("../../../shared/transformers/numeric-column-transformer");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const installed_pack_entity_1 = require("./installed-pack.entity");
const activity_template_entity_1 = require("../../activity-template/entity/activity-template.entity");
const habit_pack_type_enum_1 = require("../domain/habit-pack-type.enum");
const marketplace_request_enum_1 = require("../domain/marketplace-request.enum");
const activity_sequence_entity_1 = require("../../activity/entities/activity-sequence.entity");
let HabitPack = class HabitPack extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, pack = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, pack));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: false, type: () => String }, pack_type: { required: false, enum: require("../domain/habit-pack-type.enum").HabitPackType }, pack_name: { required: false, type: () => String }, creator_name: { required: false, type: () => String }, description: { required: false, type: () => String }, description_video_url: { required: false, type: () => String }, welcome_message: { required: false, type: () => String }, welcome_video_url: { required: false, type: () => String }, description_plain_text: { required: false, type: () => String }, welcome_message_plain_text: { required: false, type: () => String }, marketplace_approval_status: { required: false, type: () => Boolean }, marketplace_request: { required: false, enum: require("../domain/marketplace-request.enum").MarketplaceRequestType }, is_featured: { required: false, type: () => Boolean }, featured_for_onboarding: { required: false, type: () => Boolean }, language: { required: false, type: () => String }, morning_routine_duration_seconds: { required: false, type: () => Number }, evening_routine_duration_seconds: { required: false, type: () => Number }, duration: { required: false, type: () => Number }, breaks_only: { required: false, type: () => Boolean }, deleted_at: { required: false, type: () => Date }, installs: { required: false, type: () => [require("./installed-pack.entity").InstalledPack] }, activity_sequences: { required: false, type: () => [require("../../activity/entities/activity-sequence.entity").ActivitySequence] }, activity_templates: { required: false, type: () => [require("../../activity-template/entity/activity-template.entity").ActivityTemplate] }, signed_up_users: { required: false, type: () => [require("../../user/entities/user.entity").User] }, user: { required: false, type: () => require("../../user/entities/user.entity").User } };
    }
};
exports.HabitPack = HabitPack;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], HabitPack.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
    }),
    __metadata("design:type", String)
], HabitPack.prototype, "pack_type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
    }),
    __metadata("design:type", String)
], HabitPack.prototype, "pack_name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
    }),
    __metadata("design:type", String)
], HabitPack.prototype, "creator_name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
    }),
    __metadata("design:type", String)
], HabitPack.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
    }),
    __metadata("design:type", String)
], HabitPack.prototype, "description_video_url", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
    }),
    __metadata("design:type", String)
], HabitPack.prototype, "welcome_message", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
    }),
    __metadata("design:type", String)
], HabitPack.prototype, "welcome_video_url", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        default: null,
    }),
    __metadata("design:type", String)
], HabitPack.prototype, "description_plain_text", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        default: null,
    }),
    __metadata("design:type", String)
], HabitPack.prototype, "welcome_message_plain_text", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], HabitPack.prototype, "marketplace_approval_status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: marketplace_request_enum_1.MarketplaceRequestType.unrequested,
    }),
    __metadata("design:type", String)
], HabitPack.prototype, "marketplace_request", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], HabitPack.prototype, "is_featured", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], HabitPack.prototype, "featured_for_onboarding", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
    }),
    __metadata("design:type", String)
], HabitPack.prototype, "language", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], HabitPack.prototype, "morning_routine_duration_seconds", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], HabitPack.prototype, "evening_routine_duration_seconds", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], HabitPack.prototype, "duration", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], HabitPack.prototype, "breaks_only", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)(),
    __metadata("design:type", Date)
], HabitPack.prototype, "deleted_at", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => installed_pack_entity_1.InstalledPack, (installed_pack) => installed_pack.habit_pack),
    __metadata("design:type", Array)
], HabitPack.prototype, "installs", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => activity_sequence_entity_1.ActivitySequence, (activity_sequence) => activity_sequence.habit_pack),
    __metadata("design:type", Array)
], HabitPack.prototype, "activity_sequences", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => activity_template_entity_1.ActivityTemplate, (activity_template) => activity_template.habit_pack),
    __metadata("design:type", Array)
], HabitPack.prototype, "activity_templates", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => user_entity_1.User, (user) => user.sign_up_habit_pack),
    __metadata("design:type", Array)
], HabitPack.prototype, "signed_up_users", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.created_habit_packs, { onDelete: 'SET NULL', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], HabitPack.prototype, "user", void 0);
exports.HabitPack = HabitPack = __decorate([
    (0, typeorm_1.Entity)('habit_packs'),
    __metadata("design:paramtypes", [Object, Object])
], HabitPack);
//# sourceMappingURL=habit-pack.entity.js.map