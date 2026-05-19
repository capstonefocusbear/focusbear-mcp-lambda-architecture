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
exports.ActivityTemplate = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const activity_data_model_1 = require("../../activity/domain/activity-data.model");
const log_summary_type_enum_1 = require("../../activity/domain/log-summary-type.enum");
const user_entity_1 = require("../../user/entities/user.entity");
const habit_pack_entity_1 = require("../../habit-pack/entity/habit-pack.entity");
const activity_entity_1 = require("../../activity/entities/activity.entity");
const activity_sequence_entity_1 = require("../../activity/entities/activity-sequence.entity");
const log_quantity_questions_1 = require("../../activity/entities/log-quantity-questions");
const impact_category_enum_1 = require("../../activity/domain/impact-category.enum");
const tutorial_entity_1 = require("../../activity/entities/tutorial.entity");
const activity_template_tag_entity_1 = require("./activity-template-tag.entity");
const activity_template_embedding_entity_1 = require("./activity-template-embedding.entity");
let ActivityTemplate = class ActivityTemplate extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, activity = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, activity));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { pack_id: { required: false, type: () => String }, user_id: { required: false, type: () => String }, activity_type: { required: false, type: () => String }, log_summary_type: { required: false, type: () => String }, log_quantity: { required: false, type: () => Boolean }, activity_data: { required: false, type: () => require("../../activity/domain/activity-data.model").ActivityData }, has_choices: { required: false, type: () => Boolean }, duration_seconds: { required: false, type: () => Number }, completion_requirements: { required: false, type: () => String }, parent_id: { required: false, type: () => String }, linked_activity_template_id: { required: false, type: () => String }, sequence_index: { required: false, type: () => Number }, check_list: { required: false, type: () => [String] }, impact_category: { required: false, enum: require("../../activity/domain/impact-category.enum").ImpactCategory }, deleted_at: { required: false, type: () => Date }, parent_activity: { required: false, type: () => require("../../activity/entities/activity-sequence.entity").ActivitySequence }, choices: { required: false, type: () => [require("./activity-template.entity").ActivityTemplate] }, linked_activity_template: { required: false, type: () => require("../../activity/entities/activity-sequence.entity").ActivitySequence }, linked_activity_templates: { required: false, type: () => [require("../../activity/entities/activity.entity").Activity] }, log_quantity_questions: { required: false, type: () => [require("../../activity/entities/log-quantity-questions").LogQuantityQuestion] }, habit_pack: { required: false, type: () => require("../../habit-pack/entity/habit-pack.entity").HabitPack }, user: { required: false, type: () => require("../../user/entities/user.entity").User }, activities: { required: false, type: () => [require("../../activity/entities/activity.entity").Activity] }, tutorial: { required: false, type: () => require("../../activity/entities/tutorial.entity").Tutorial }, tags: { required: false, type: () => [require("./activity-template-tag.entity").ActivityTemplateTag] }, embeddings: { required: false, type: () => [require("./activity-template-embedding.entity").ActivityTemplateEmbedding] } };
    }
};
exports.ActivityTemplate = ActivityTemplate;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], ActivityTemplate.prototype, "pack_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], ActivityTemplate.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
    }),
    __metadata("design:type", String)
], ActivityTemplate.prototype, "activity_type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: log_summary_type_enum_1.LogSummaryType,
        default: log_summary_type_enum_1.LogSummaryType.SUM,
    }),
    __metadata("design:type", String)
], ActivityTemplate.prototype, "log_summary_type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], ActivityTemplate.prototype, "log_quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        nullable: false,
        transformer: base_entity_entity_1.BaseEntity.encryptJSONField('activity_data'),
    }),
    __metadata("design:type", activity_data_model_1.ActivityData)
], ActivityTemplate.prototype, "activity_data", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], ActivityTemplate.prototype, "has_choices", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        nullable: false,
    }),
    __metadata("design:type", Number)
], ActivityTemplate.prototype, "duration_seconds", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        default: null,
    }),
    __metadata("design:type", String)
], ActivityTemplate.prototype, "completion_requirements", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
    }),
    __metadata("design:type", String)
], ActivityTemplate.prototype, "parent_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
        default: null,
    }),
    __metadata("design:type", String)
], ActivityTemplate.prototype, "linked_activity_template_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        nullable: false,
        default: 0,
    }),
    __metadata("design:type", Number)
], ActivityTemplate.prototype, "sequence_index", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        nullable: true,
        transformer: base_entity_entity_1.BaseEntity.encryptJSONField('check_list'),
    }),
    __metadata("design:type", Array)
], ActivityTemplate.prototype, "check_list", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        name: 'impact_category',
        enum: impact_category_enum_1.ImpactCategory,
        nullable: true,
        default: null,
    }),
    __metadata("design:type", String)
], ActivityTemplate.prototype, "impact_category", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)(),
    __metadata("design:type", Date)
], ActivityTemplate.prototype, "deleted_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ActivityTemplate, (activity_template) => activity_template.choices, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'parent_id' }),
    __metadata("design:type", activity_sequence_entity_1.ActivitySequence)
], ActivityTemplate.prototype, "parent_activity", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ActivityTemplate, (activity_template) => activity_template.parent_activity),
    __metadata("design:type", Array)
], ActivityTemplate.prototype, "choices", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ActivityTemplate, (activityTemplate) => activityTemplate.linked_activity_templates, {
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'linked_activity_template_id' }),
    __metadata("design:type", activity_sequence_entity_1.ActivitySequence)
], ActivityTemplate.prototype, "linked_activity_template", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ActivityTemplate, (activityTemplate) => activityTemplate.linked_activity_template),
    __metadata("design:type", Array)
], ActivityTemplate.prototype, "linked_activity_templates", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => log_quantity_questions_1.LogQuantityQuestion, (question) => question.activity_template),
    __metadata("design:type", Array)
], ActivityTemplate.prototype, "log_quantity_questions", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => habit_pack_entity_1.HabitPack, (habit_pack) => habit_pack.activity_templates, {
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'pack_id' }),
    __metadata("design:type", habit_pack_entity_1.HabitPack)
], ActivityTemplate.prototype, "habit_pack", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.activity_templates, { onDelete: 'SET NULL', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], ActivityTemplate.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => activity_entity_1.Activity, (activity) => activity.activity_template),
    __metadata("design:type", Array)
], ActivityTemplate.prototype, "activities", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => tutorial_entity_1.Tutorial, (tutorial) => tutorial.activity_template),
    __metadata("design:type", tutorial_entity_1.Tutorial)
], ActivityTemplate.prototype, "tutorial", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => activity_template_tag_entity_1.ActivityTemplateTag, (activityTemplateTag) => activityTemplateTag.activity_template),
    __metadata("design:type", Array)
], ActivityTemplate.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => activity_template_embedding_entity_1.ActivityTemplateEmbedding, (embedding) => embedding.activity_template),
    __metadata("design:type", Object)
], ActivityTemplate.prototype, "embeddings", void 0);
exports.ActivityTemplate = ActivityTemplate = __decorate([
    (0, typeorm_1.Entity)('activity_template'),
    __metadata("design:paramtypes", [Object, Object])
], ActivityTemplate);
//# sourceMappingURL=activity-template.entity.js.map