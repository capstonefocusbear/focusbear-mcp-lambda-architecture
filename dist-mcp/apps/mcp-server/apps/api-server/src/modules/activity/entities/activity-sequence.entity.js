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
exports.ActivitySequence = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const activity_type_enum_1 = require("../domain/activity-type.enum");
const user_entity_1 = require("../../user/entities/user.entity");
const activity_entity_1 = require("./activity.entity");
const completed_activity_entity_1 = require("./completed-activity.entity");
const completed_activity_sequence_entity_1 = require("./completed-activity-sequence.entity");
const habit_pack_entity_1 = require("../../habit-pack/entity/habit-pack.entity");
const custom_routine_1 = require("../../user/entities/custom-routine");
let ActivitySequence = class ActivitySequence extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, sequence = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, sequence));
    }
    get sequenceActivityIds() {
        return this.generated_sequence_activity_ids || this.activity_ids;
    }
    get sequenceDurationSeconds() {
        return this.generated_total_duration_seconds || this.total_duration_seconds;
    }
    get sequenceDurationMinutes() {
        return this.sequenceDurationSeconds / 60;
    }
    resetFlexSequence() {
        this.generated_sequence_activity_ids = null;
        this.generated_total_duration_seconds = null;
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: false, type: () => String }, type: { required: false, enum: require("../domain/activity-type.enum").ActivityType }, activity_ids: { required: false, type: () => [String] }, generated_sequence_activity_ids: { required: false, type: () => [String] }, total_duration_seconds: { required: false, type: () => Number }, generated_total_duration_seconds: { required: false, type: () => Number }, pack_id: { required: false, type: () => String }, custom_routine_id: { required: false, type: () => String }, user: { required: false, type: () => require("../../user/entities/user.entity").User }, habit_pack: { required: false, type: () => require("../../habit-pack/entity/habit-pack.entity").HabitPack }, activities: { required: false, type: () => [require("./activity.entity").Activity] }, completed_activities: { required: false, type: () => [require("./completed-activity.entity").CompletedActivity] }, completed_activity_sequences: { required: false, type: () => [require("./completed-activity-sequence.entity").CompletedActivitySequence] }, custom_routine: { required: false, type: () => require("../../user/entities/custom-routine").CustomRoutine } };
    }
};
exports.ActivitySequence = ActivitySequence;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], ActivitySequence.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: activity_type_enum_1.ActivityType,
        nullable: false,
    }),
    __metadata("design:type", String)
], ActivitySequence.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        nullable: false,
        transformer: base_entity_entity_1.BaseEntity.encryptJSONField('activity_ids'),
    }),
    __metadata("design:type", Array)
], ActivitySequence.prototype, "activity_ids", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        nullable: true,
    }),
    __metadata("design:type", Array)
], ActivitySequence.prototype, "generated_sequence_activity_ids", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        nullable: false,
    }),
    __metadata("design:type", Number)
], ActivitySequence.prototype, "total_duration_seconds", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        nullable: true,
    }),
    __metadata("design:type", Number)
], ActivitySequence.prototype, "generated_total_duration_seconds", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
    }),
    __metadata("design:type", String)
], ActivitySequence.prototype, "pack_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
    }),
    __metadata("design:type", String)
], ActivitySequence.prototype, "custom_routine_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.activity_sequences, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], ActivitySequence.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => habit_pack_entity_1.HabitPack, (habit_pack) => habit_pack.activity_sequences, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'pack_id' }),
    __metadata("design:type", habit_pack_entity_1.HabitPack)
], ActivitySequence.prototype, "habit_pack", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => activity_entity_1.Activity, (activity) => activity.activity_sequence),
    __metadata("design:type", Array)
], ActivitySequence.prototype, "activities", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => completed_activity_entity_1.CompletedActivity, (completed) => completed.activity_sequence),
    __metadata("design:type", Array)
], ActivitySequence.prototype, "completed_activities", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => completed_activity_sequence_entity_1.CompletedActivitySequence, (completed_sequence) => completed_sequence.activity_sequence),
    __metadata("design:type", Array)
], ActivitySequence.prototype, "completed_activity_sequences", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => custom_routine_1.CustomRoutine, (custom_routine) => custom_routine.activitySequences, {
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'custom_routine_id' }),
    __metadata("design:type", custom_routine_1.CustomRoutine)
], ActivitySequence.prototype, "custom_routine", void 0);
exports.ActivitySequence = ActivitySequence = __decorate([
    (0, typeorm_1.Entity)('activity_sequences'),
    __metadata("design:paramtypes", [Object, Object])
], ActivitySequence);
//# sourceMappingURL=activity-sequence.entity.js.map