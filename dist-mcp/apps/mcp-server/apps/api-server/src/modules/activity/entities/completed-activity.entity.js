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
exports.CompletedActivity = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const activity_entity_1 = require("./activity.entity");
const activity_sequence_entity_1 = require("./activity-sequence.entity");
const completed_activity_sequence_entity_1 = require("./completed-activity-sequence.entity");
const completed_activity_metadata_1 = require("../domain/completed-activity.metadata");
const log_quantity_answers_1 = require("./log-quantity-answers");
let CompletedActivity = class CompletedActivity extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, sequence = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false, log_quantity: false }; }
        super(id, Object.assign({}, options));
        const quantity_logged = options.log_quantity ? sequence.quantity_logged : null;
        Object.assign(this, Object.assign(Object.assign({}, sequence), { quantity_logged }));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: false, type: () => String }, activity_id: { required: false, type: () => String }, activity_sequence_id: { required: false, type: () => String }, start_time: { required: false, type: () => Date }, finish_time: { required: false, type: () => Date }, quantity_logged: { required: false, type: () => Number }, duration_logged: { required: false, type: () => Number }, completed_sequence_id: { required: false, type: () => String }, activity_note: { required: false, type: () => String }, metadata: { required: false, type: () => require("../domain/completed-activity.metadata").CompletedActivityMetadata }, user: { required: false, type: () => require("../../user/entities/user.entity").User }, activity: { required: false, type: () => require("./activity.entity").Activity }, activity_sequence: { required: false, type: () => require("./activity-sequence.entity").ActivitySequence }, completed_sequence_log: { required: false, type: () => require("./completed-activity-sequence.entity").CompletedActivitySequence }, answers: { required: false, type: () => [require("./log-quantity-answers").LogQuantityAnswer] } };
    }
};
exports.CompletedActivity = CompletedActivity;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
    }),
    __metadata("design:type", String)
], CompletedActivity.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
    }),
    __metadata("design:type", String)
], CompletedActivity.prototype, "activity_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
    }),
    __metadata("design:type", String)
], CompletedActivity.prototype, "activity_sequence_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], CompletedActivity.prototype, "start_time", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], CompletedActivity.prototype, "finish_time", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
    }),
    __metadata("design:type", Number)
], CompletedActivity.prototype, "quantity_logged", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
    }),
    __metadata("design:type", Number)
], CompletedActivity.prototype, "duration_logged", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'uuid',
    }),
    __metadata("design:type", String)
], CompletedActivity.prototype, "completed_sequence_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'text',
        transformer: base_entity_entity_1.BaseEntity.encryptField('activity_note'),
    }),
    __metadata("design:type", String)
], CompletedActivity.prototype, "activity_note", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        nullable: true,
    }),
    __metadata("design:type", completed_activity_metadata_1.CompletedActivityMetadata)
], CompletedActivity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.completed_activities, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], CompletedActivity.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => activity_entity_1.Activity, (activity) => activity.completed_activities, { onDelete: 'SET NULL', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'activity_id' }),
    __metadata("design:type", activity_entity_1.Activity)
], CompletedActivity.prototype, "activity", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => activity_sequence_entity_1.ActivitySequence, (sequence) => sequence.completed_activities, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'activity_sequence_id' }),
    __metadata("design:type", activity_sequence_entity_1.ActivitySequence)
], CompletedActivity.prototype, "activity_sequence", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => completed_activity_sequence_entity_1.CompletedActivitySequence, (sequence_log) => sequence_log.completed_activity_logs, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'completed_sequence_id' }),
    __metadata("design:type", completed_activity_sequence_entity_1.CompletedActivitySequence)
], CompletedActivity.prototype, "completed_sequence_log", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => log_quantity_answers_1.LogQuantityAnswer, (answer) => answer.completed_activity),
    __metadata("design:type", Array)
], CompletedActivity.prototype, "answers", void 0);
exports.CompletedActivity = CompletedActivity = __decorate([
    (0, typeorm_1.Entity)('completed_activities'),
    (0, typeorm_1.Unique)('unique_index_activity_id_completed_sequence_id', ['activity_id', 'completed_sequence_id']),
    __metadata("design:paramtypes", [Object, Object])
], CompletedActivity);
//# sourceMappingURL=completed-activity.entity.js.map