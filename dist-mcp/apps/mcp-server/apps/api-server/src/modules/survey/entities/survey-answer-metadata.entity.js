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
exports.SurveyAnswerMetadata = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const survey_entity_1 = require("./survey.entity");
const survey_answer_entity_1 = require("./survey-answer.entity");
let SurveyAnswerMetadata = class SurveyAnswerMetadata extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, surveyMetadata = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, surveyMetadata));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { feature: { required: true, type: () => String }, device: { required: true, type: () => String }, operating_system: { required: true, type: () => String }, version: { required: true, type: () => String }, survey_id: { required: true, type: () => String }, survey_answer_id: { required: true, type: () => String }, user_id: { required: true, type: () => String }, survey: { required: false, type: () => require("./survey.entity").Survey }, user: { required: false, type: () => require("../../user/entities/user.entity").User }, surveyAnswer: { required: false, type: () => require("./survey-answer.entity").SurveyAnswer } };
    }
};
exports.SurveyAnswerMetadata = SurveyAnswerMetadata;
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: false,
    }),
    __metadata("design:type", String)
], SurveyAnswerMetadata.prototype, "feature", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: false,
    }),
    __metadata("design:type", String)
], SurveyAnswerMetadata.prototype, "device", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: false,
    }),
    __metadata("design:type", String)
], SurveyAnswerMetadata.prototype, "operating_system", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: false,
    }),
    __metadata("design:type", String)
], SurveyAnswerMetadata.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], SurveyAnswerMetadata.prototype, "survey_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], SurveyAnswerMetadata.prototype, "survey_answer_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], SurveyAnswerMetadata.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => survey_entity_1.Survey, (survey) => survey.id),
    (0, typeorm_1.JoinColumn)({ name: 'survey_id' }),
    __metadata("design:type", survey_entity_1.Survey)
], SurveyAnswerMetadata.prototype, "survey", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.id),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], SurveyAnswerMetadata.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => survey_answer_entity_1.SurveyAnswer, (surveyAnswer) => surveyAnswer.id),
    (0, typeorm_1.JoinColumn)({ name: 'survey_answer_id' }),
    __metadata("design:type", survey_answer_entity_1.SurveyAnswer)
], SurveyAnswerMetadata.prototype, "surveyAnswer", void 0);
exports.SurveyAnswerMetadata = SurveyAnswerMetadata = __decorate([
    (0, typeorm_1.Entity)('survey_answer_metadata'),
    __metadata("design:paramtypes", [Object, Object])
], SurveyAnswerMetadata);
//# sourceMappingURL=survey-answer-metadata.entity.js.map