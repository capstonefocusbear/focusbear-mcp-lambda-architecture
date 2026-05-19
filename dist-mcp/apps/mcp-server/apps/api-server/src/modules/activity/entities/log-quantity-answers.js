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
exports.LogQuantityAnswer = void 0;
const typeorm_1 = require("typeorm");
const numeric_column_transformer_1 = require("../../../shared/transformers/numeric-column-transformer");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const activity_entity_1 = require("./activity.entity");
const log_quantity_questions_1 = require("./log-quantity-questions");
const completed_activity_entity_1 = require("./completed-activity.entity");
let LogQuantityAnswer = class LogQuantityAnswer extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, questionData = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, questionData));
    }
};
exports.LogQuantityAnswer = LogQuantityAnswer;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], LogQuantityAnswer.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], LogQuantityAnswer.prototype, "activity_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], LogQuantityAnswer.prototype, "question_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], LogQuantityAnswer.prototype, "completed_activity_log_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        nullable: false,
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], LogQuantityAnswer.prototype, "logged_value", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
        nullable: false,
        default: new Date(),
    }),
    __metadata("design:type", Date)
], LogQuantityAnswer.prototype, "date_logged", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.log_quantity_answers, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], LogQuantityAnswer.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => activity_entity_1.Activity, (activity) => activity.completed_activities, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'activity_id' }),
    __metadata("design:type", activity_entity_1.Activity)
], LogQuantityAnswer.prototype, "activity", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => log_quantity_questions_1.LogQuantityQuestion, (question) => question.answers, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'question_id' }),
    __metadata("design:type", log_quantity_questions_1.LogQuantityQuestion)
], LogQuantityAnswer.prototype, "question", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => completed_activity_entity_1.CompletedActivity, (completedActivity) => completedActivity.answers, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'completed_activity_log_id' }),
    __metadata("design:type", completed_activity_entity_1.CompletedActivity)
], LogQuantityAnswer.prototype, "completed_activity", void 0);
exports.LogQuantityAnswer = LogQuantityAnswer = __decorate([
    (0, typeorm_1.Entity)('log_quantity_answers'),
    __metadata("design:paramtypes", [Object, Object])
], LogQuantityAnswer);
//# sourceMappingURL=log-quantity-answers.js.map