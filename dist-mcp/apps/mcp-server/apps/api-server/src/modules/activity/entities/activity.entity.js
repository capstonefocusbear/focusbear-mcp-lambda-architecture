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
exports.Activity = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const activity_data_model_1 = require("../domain/activity-data.model");
const activity_type_enum_1 = require("../domain/activity-type.enum");
const log_summary_type_enum_1 = require("../domain/log-summary-type.enum");
const activity_sequence_entity_1 = require("./activity-sequence.entity");
const completed_activity_entity_1 = require("./completed-activity.entity");
const activity_template_entity_1 = require("../../activity-template/entity/activity-template.entity");
const log_quantity_questions_1 = require("./log-quantity-questions");
const impact_category_enum_1 = require("../domain/impact-category.enum");
const tutorial_entity_1 = require("./tutorial.entity");
const geofence_entity_1 = require("../../geofence/entities/geofence.entity");
let Activity = class Activity extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id, log_summary_type } = _a, activity = __rest(_a, ["id", "log_summary_type"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign(Object.assign({}, activity), { log_summary_type: log_summary_type || log_summary_type_enum_1.LogSummaryType.SUM }));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: false, type: () => String }, parent_id: { required: false, type: () => String }, linked_activity_id: { required: false, type: () => String }, activity_template_id: { required: false, type: () => String }, has_choices: { required: false, type: () => Boolean }, activity_sequence_id: { required: false, type: () => String }, type: { required: false, enum: require("../domain/activity-type.enum").ActivityType }, log_summary_type: { required: false, type: () => String }, log_quantity: { required: false, type: () => Boolean }, duration_seconds: { required: false, type: () => Number }, completion_requirements: { required: false, type: () => String }, activity_data: { required: false, type: () => require("../domain/activity-data.model").ActivityData }, is_default: { required: false, type: () => Boolean }, run_micro_breaks: { required: false, type: () => Boolean }, days_of_week: { required: false, enum: require("../domain/days-of-week.enum").DaysOfWeek, isArray: true }, check_list: { required: false, type: () => [String] }, impact_category: { required: false, enum: require("../domain/impact-category.enum").ImpactCategory }, cutoff_time_for_doing_activity: { required: false, type: () => String }, geofence_id: { required: false, type: () => String }, is_deleted: { required: false, type: () => Boolean }, geofence: { required: false, type: () => require("../../geofence/entities/geofence.entity").Geofence }, activity_sequence: { required: false, type: () => require("./activity-sequence.entity").ActivitySequence }, completed_activities: { required: false, type: () => [require("./completed-activity.entity").CompletedActivity] }, parent_activity: { required: false, type: () => require("./activity-sequence.entity").ActivitySequence }, linked_activity: { required: false, type: () => require("./activity-sequence.entity").ActivitySequence }, linked_activities: { required: false, type: () => [require("./activity.entity").Activity] }, choices: { required: false, type: () => [require("./activity.entity").Activity] }, log_quantity_questions: { required: false, type: () => [require("./log-quantity-questions").LogQuantityQuestion] }, user: { required: false, type: () => require("../../user/entities/user.entity").User }, user_activities: { required: false, type: () => require("../../user/entities/user.entity").User }, activity_template: { required: false, type: () => require("../../activity-template/entity/activity-template.entity").ActivityTemplate }, tutorial: { required: false, type: () => require("./tutorial.entity").Tutorial } };
    }
};
exports.Activity = Activity;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], Activity.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
    }),
    __metadata("design:type", String)
], Activity.prototype, "parent_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
        default: null,
    }),
    __metadata("design:type", String)
], Activity.prototype, "linked_activity_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
    }),
    __metadata("design:type", String)
], Activity.prototype, "activity_template_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], Activity.prototype, "has_choices", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], Activity.prototype, "activity_sequence_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        name: 'activity_type',
        enum: activity_type_enum_1.ActivityType,
        nullable: false,
    }),
    __metadata("design:type", String)
], Activity.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: log_summary_type_enum_1.LogSummaryType,
        default: log_summary_type_enum_1.LogSummaryType.SUM,
    }),
    __metadata("design:type", String)
], Activity.prototype, "log_summary_type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], Activity.prototype, "log_quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        nullable: false,
    }),
    __metadata("design:type", Number)
], Activity.prototype, "duration_seconds", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        default: null,
    }),
    __metadata("design:type", String)
], Activity.prototype, "completion_requirements", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        nullable: false,
        transformer: base_entity_entity_1.BaseEntity.encryptJSONField('activity_data'),
    }),
    __metadata("design:type", activity_data_model_1.ActivityData)
], Activity.prototype, "activity_data", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], Activity.prototype, "is_default", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], Activity.prototype, "run_micro_breaks", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
    }),
    __metadata("design:type", Array)
], Activity.prototype, "days_of_week", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        nullable: true,
        transformer: base_entity_entity_1.BaseEntity.encryptJSONField('check_list'),
    }),
    __metadata("design:type", Array)
], Activity.prototype, "check_list", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        name: 'impact_category',
        enum: impact_category_enum_1.ImpactCategory,
        nullable: true,
        default: null,
    }),
    __metadata("design:type", String)
], Activity.prototype, "impact_category", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
    }),
    __metadata("design:type", String)
], Activity.prototype, "cutoff_time_for_doing_activity", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
        default: null,
    }),
    __metadata("design:type", String)
], Activity.prototype, "geofence_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], Activity.prototype, "is_deleted", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => geofence_entity_1.Geofence, { onDelete: 'SET NULL', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'geofence_id' }),
    __metadata("design:type", geofence_entity_1.Geofence)
], Activity.prototype, "geofence", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => activity_sequence_entity_1.ActivitySequence, (activity_sequence) => activity_sequence.activities, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'activity_sequence_id' }),
    __metadata("design:type", activity_sequence_entity_1.ActivitySequence)
], Activity.prototype, "activity_sequence", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => completed_activity_entity_1.CompletedActivity, (completed_activity) => completed_activity.activity, {
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
    }),
    __metadata("design:type", Array)
], Activity.prototype, "completed_activities", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Activity, (activity) => activity.choices, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'parent_id' }),
    __metadata("design:type", activity_sequence_entity_1.ActivitySequence)
], Activity.prototype, "parent_activity", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Activity, (activity) => activity.linked_activities, { onDelete: 'SET NULL', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'linked_activity_id' }),
    __metadata("design:type", activity_sequence_entity_1.ActivitySequence)
], Activity.prototype, "linked_activity", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Activity, (activity) => activity.linked_activity),
    __metadata("design:type", Array)
], Activity.prototype, "linked_activities", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Activity, (activity) => activity.parent_activity),
    __metadata("design:type", Array)
], Activity.prototype, "choices", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => log_quantity_questions_1.LogQuantityQuestion, (question) => question.activity),
    __metadata("design:type", Array)
], Activity.prototype, "log_quantity_questions", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => user_entity_1.User, (user) => user.current_activity),
    __metadata("design:type", user_entity_1.User)
], Activity.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.activities, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], Activity.prototype, "user_activities", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => activity_template_entity_1.ActivityTemplate, (activity_template) => activity_template.activities, {
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'activity_template_id' }),
    __metadata("design:type", activity_template_entity_1.ActivityTemplate)
], Activity.prototype, "activity_template", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => tutorial_entity_1.Tutorial, (tutorial) => tutorial.activity),
    __metadata("design:type", tutorial_entity_1.Tutorial)
], Activity.prototype, "tutorial", void 0);
exports.Activity = Activity = __decorate([
    (0, typeorm_1.Entity)('activities'),
    __metadata("design:paramtypes", [Object, Object])
], Activity);
//# sourceMappingURL=activity.entity.js.map