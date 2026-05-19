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
exports.CompletedActivitySequence = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_daily_stats_entity_1 = require("../../user/entities/user-daily-stats.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const activity_sequence_entity_1 = require("./activity-sequence.entity");
const completed_activity_entity_1 = require("./completed-activity.entity");
let CompletedActivitySequence = class CompletedActivitySequence extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, sequence = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, sequence));
    }
    finalizeUncompletedLog() {
        this.setMetrics();
        this.is_completed = true;
        this.finish_time = this.defineSequenceFinishTime();
    }
    defineSequenceFinishTime() {
        if (!(this === null || this === void 0 ? void 0 : this.completed_activity_logs))
            return null;
        const getEndDate = (e) => e === null || e === void 0 ? void 0 : e.finish_time;
        const removeNulls = (e) => !!e;
        const sortDesc = (a, b) => b.getTime() - a.getTime();
        const [latest] = this.completed_activity_logs.map(getEndDate).filter(removeNulls).sort(sortDesc);
        return latest;
    }
    setMetrics() {
        var _a, _b;
        this.plan_duration_minutes = (_b = (_a = this === null || this === void 0 ? void 0 : this.activity_sequence) === null || _a === void 0 ? void 0 : _a.sequenceDurationMinutes) !== null && _b !== void 0 ? _b : 0;
        this.duration_minutes = this.countFactSequenceDurationMinutes();
        this.duration_percent_deviation = this.countDurationPercentDeviation();
    }
    countFactSequenceDurationMinutes() {
        var _a;
        const extractDuration = (e) => { var _a; return (_a = e === null || e === void 0 ? void 0 : e.duration_logged) !== null && _a !== void 0 ? _a : 0; };
        const loggedDurationsInSeconds = (_a = this.completed_activity_logs) === null || _a === void 0 ? void 0 : _a.map(extractDuration);
        if (!loggedDurationsInSeconds)
            return 0;
        const addUp = (previousValue, currentValue) => Number(previousValue) + Number(currentValue);
        const totalInSeconds = loggedDurationsInSeconds.reduce(addUp, 0);
        const totalInMinutes = totalInSeconds / 60;
        return totalInMinutes;
    }
    countDurationPercentDeviation() {
        if (!this.plan_duration_minutes)
            return 0;
        return Math.round((this.duration_minutes / this.plan_duration_minutes) * 100 - 100);
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: false, type: () => String }, activity_sequence_id: { required: false, type: () => String }, start_time: { required: false, type: () => Date }, finish_time: { required: false, type: () => Date }, duration_minutes: { required: false, type: () => Number }, plan_duration_minutes: { required: false, type: () => Number }, is_completed: { required: false, type: () => Boolean }, duration_percent_deviation: { required: false, type: () => Number }, user: { required: false, type: () => require("../../user/entities/user.entity").User }, activity_sequence: { required: false, type: () => require("./activity-sequence.entity").ActivitySequence }, completed_activity_logs: { required: false, type: () => [require("./completed-activity.entity").CompletedActivity] }, completed_morning_sequence: { required: false, type: () => require("../../user/entities/user-daily-stats.entity").DailyStats }, completed_evening_sequence: { required: false, type: () => require("../../user/entities/user-daily-stats.entity").DailyStats }, completed_break_sequence: { required: true, type: () => require("../../user/entities/user-daily-stats.entity").DailyStats } };
    }
};
exports.CompletedActivitySequence = CompletedActivitySequence;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
    }),
    __metadata("design:type", String)
], CompletedActivitySequence.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
    }),
    __metadata("design:type", String)
], CompletedActivitySequence.prototype, "activity_sequence_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], CompletedActivitySequence.prototype, "start_time", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], CompletedActivitySequence.prototype, "finish_time", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
    }),
    __metadata("design:type", Number)
], CompletedActivitySequence.prototype, "duration_minutes", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
    }),
    __metadata("design:type", Number)
], CompletedActivitySequence.prototype, "plan_duration_minutes", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'boolean',
        nullable: false,
    }),
    __metadata("design:type", Boolean)
], CompletedActivitySequence.prototype, "is_completed", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'integer',
    }),
    __metadata("design:type", Number)
], CompletedActivitySequence.prototype, "duration_percent_deviation", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.completed_activity_sequences, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], CompletedActivitySequence.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => activity_sequence_entity_1.ActivitySequence, (sequence) => sequence.completed_activity_sequences, {
        eager: true,
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'activity_sequence_id' }),
    __metadata("design:type", activity_sequence_entity_1.ActivitySequence)
], CompletedActivitySequence.prototype, "activity_sequence", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => completed_activity_entity_1.CompletedActivity, (activity_log) => activity_log.completed_sequence_log),
    __metadata("design:type", Array)
], CompletedActivitySequence.prototype, "completed_activity_logs", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => user_daily_stats_entity_1.DailyStats, (daily_stat) => daily_stat.morning_sequence_log),
    __metadata("design:type", user_daily_stats_entity_1.DailyStats)
], CompletedActivitySequence.prototype, "completed_morning_sequence", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => user_daily_stats_entity_1.DailyStats, (daily_stat) => daily_stat.evening_sequence_log),
    __metadata("design:type", user_daily_stats_entity_1.DailyStats)
], CompletedActivitySequence.prototype, "completed_evening_sequence", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => user_daily_stats_entity_1.DailyStats, (daily_stat) => daily_stat.break_sequence_log),
    __metadata("design:type", user_daily_stats_entity_1.DailyStats)
], CompletedActivitySequence.prototype, "completed_break_sequence", void 0);
exports.CompletedActivitySequence = CompletedActivitySequence = __decorate([
    (0, typeorm_1.Entity)('completed_activity_sequences'),
    __metadata("design:paramtypes", [Object, Object])
], CompletedActivitySequence);
//# sourceMappingURL=completed-activity-sequence.entity.js.map