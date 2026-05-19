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
exports.DailyStats = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const numeric_column_transformer_1 = require("../../../shared/transformers/numeric-column-transformer");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const completed_activity_sequence_entity_1 = require("../../activity/entities/completed-activity-sequence.entity");
const user_entity_1 = require("./user.entity");
let DailyStats = class DailyStats extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, user = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, user));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: false, type: () => String }, date_completed: { required: false, type: () => Date }, focus_modes_completed: { required: false, type: () => Number }, morning_routine_completion_percentage: { required: false, type: () => Number }, evening_routine_completion_percentage: { required: false, type: () => Number }, micro_breaks_routine_completion_percentage: { required: false, type: () => Number }, should_recalculate: { required: false, type: () => Boolean }, morning_sequence_log_id: { required: false, type: () => String }, evening_sequence_log_id: { required: false, type: () => String }, number_of_distractions_blocked: { required: false, type: () => Number }, seconds_spent_doing_breaks: { required: false, type: () => Number }, seconds_spent_in_focus_sessions: { required: false, type: () => Number }, break_sequence_log_id: { required: false, type: () => String }, morning_sequence_log: { required: false, type: () => require("../../activity/entities/completed-activity-sequence.entity").CompletedActivitySequence }, evening_sequence_log: { required: false, type: () => require("../../activity/entities/completed-activity-sequence.entity").CompletedActivitySequence }, user: { required: false, type: () => require("./user.entity").User }, break_sequence_log: { required: false, type: () => require("../../activity/entities/completed-activity-sequence.entity").CompletedActivitySequence } };
    }
};
exports.DailyStats = DailyStats;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], DailyStats.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], DailyStats.prototype, "date_completed", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], DailyStats.prototype, "focus_modes_completed", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], DailyStats.prototype, "morning_routine_completion_percentage", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], DailyStats.prototype, "evening_routine_completion_percentage", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], DailyStats.prototype, "micro_breaks_routine_completion_percentage", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
    }),
    __metadata("design:type", Boolean)
], DailyStats.prototype, "should_recalculate", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
    }),
    __metadata("design:type", String)
], DailyStats.prototype, "morning_sequence_log_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
    }),
    __metadata("design:type", String)
], DailyStats.prototype, "evening_sequence_log_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], DailyStats.prototype, "number_of_distractions_blocked", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], DailyStats.prototype, "seconds_spent_doing_breaks", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], DailyStats.prototype, "seconds_spent_in_focus_sessions", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
    }),
    __metadata("design:type", String)
], DailyStats.prototype, "break_sequence_log_id", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => completed_activity_sequence_entity_1.CompletedActivitySequence, (completed_sequence) => completed_sequence.completed_morning_sequence),
    (0, typeorm_1.JoinColumn)({ name: 'morning_sequence_log_id' }),
    __metadata("design:type", completed_activity_sequence_entity_1.CompletedActivitySequence)
], DailyStats.prototype, "morning_sequence_log", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => completed_activity_sequence_entity_1.CompletedActivitySequence, (completed_sequence) => completed_sequence.completed_morning_sequence),
    (0, typeorm_1.JoinColumn)({ name: 'evening_sequence_log_id' }),
    __metadata("design:type", completed_activity_sequence_entity_1.CompletedActivitySequence)
], DailyStats.prototype, "evening_sequence_log", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.consents, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], DailyStats.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => completed_activity_sequence_entity_1.CompletedActivitySequence, (completed_sequence) => completed_sequence.completed_break_sequence),
    (0, typeorm_1.JoinColumn)({ name: 'break_sequence_log_id' }),
    __metadata("design:type", completed_activity_sequence_entity_1.CompletedActivitySequence)
], DailyStats.prototype, "break_sequence_log", void 0);
exports.DailyStats = DailyStats = __decorate([
    (0, typeorm_1.Entity)('daily_stats'),
    __metadata("design:paramtypes", [Object, Object])
], DailyStats);
//# sourceMappingURL=user-daily-stats.entity.js.map