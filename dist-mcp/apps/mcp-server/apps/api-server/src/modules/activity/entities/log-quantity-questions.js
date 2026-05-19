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
exports.LogQuantityQuestion = void 0;
const typeorm_1 = require("typeorm");
const numeric_column_transformer_1 = require("../../../shared/transformers/numeric-column-transformer");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const activity_entity_1 = require("./activity.entity");
const log_quantity_answers_1 = require("./log-quantity-answers");
const activity_template_entity_1 = require("../../activity-template/entity/activity-template.entity");
const log_summary_type_enum_1 = require("../domain/log-summary-type.enum");
let LogQuantityQuestion = class LogQuantityQuestion extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, questionData = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, questionData));
    }
};
exports.LogQuantityQuestion = LogQuantityQuestion;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], LogQuantityQuestion.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
    }),
    __metadata("design:type", String)
], LogQuantityQuestion.prototype, "activity_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
    }),
    __metadata("design:type", String)
], LogQuantityQuestion.prototype, "activity_template_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
        default: null,
    }),
    __metadata("design:type", String)
], LogQuantityQuestion.prototype, "linked_question_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: false }),
    __metadata("design:type", String)
], LogQuantityQuestion.prototype, "question", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], LogQuantityQuestion.prototype, "min_value_description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], LogQuantityQuestion.prototype, "max_value_description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        nullable: true,
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], LogQuantityQuestion.prototype, "min_value", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        nullable: true,
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], LogQuantityQuestion.prototype, "max_value", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: log_summary_type_enum_1.LogSummaryType,
        default: log_summary_type_enum_1.LogSummaryType.SUM,
        nullable: false,
    }),
    __metadata("design:type", String)
], LogQuantityQuestion.prototype, "log_summary_type", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.log_quantity_questions, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], LogQuantityQuestion.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => activity_entity_1.Activity, (activity) => activity.log_quantity_questions, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'activity_id' }),
    __metadata("design:type", activity_entity_1.Activity)
], LogQuantityQuestion.prototype, "activity", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => activity_template_entity_1.ActivityTemplate, (activity) => activity.log_quantity_questions, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'activity_template_id' }),
    __metadata("design:type", activity_template_entity_1.ActivityTemplate)
], LogQuantityQuestion.prototype, "activity_template", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => log_quantity_answers_1.LogQuantityAnswer, (answer) => answer.question),
    __metadata("design:type", Array)
], LogQuantityQuestion.prototype, "answers", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => LogQuantityQuestion, (question) => question.linked_questions, {
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'linked_question_id' }),
    __metadata("design:type", LogQuantityQuestion)
], LogQuantityQuestion.prototype, "linked_question", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => LogQuantityQuestion, (question) => question.linked_question),
    __metadata("design:type", Array)
], LogQuantityQuestion.prototype, "linked_questions", void 0);
exports.LogQuantityQuestion = LogQuantityQuestion = __decorate([
    (0, typeorm_1.Entity)('log_quantity_questions'),
    __metadata("design:paramtypes", [Object, Object])
], LogQuantityQuestion);
//# sourceMappingURL=log-quantity-questions.js.map