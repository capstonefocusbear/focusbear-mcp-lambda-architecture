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
exports.SurveyAnswer = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const survey_entity_1 = require("./survey.entity");
let SurveyAnswer = class SurveyAnswer extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, answer = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, answer));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { reply: { required: true, type: () => String }, rating: { required: false, type: () => Number }, survey_id: { required: true, type: () => String }, user_id: { required: true, type: () => String }, completed: { required: true, type: () => Boolean }, survey: { required: false, type: () => require("./survey.entity").Survey }, user: { required: false, type: () => require("../../user/entities/user.entity").User } };
    }
};
exports.SurveyAnswer = SurveyAnswer;
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: false,
        transformer: base_entity_entity_1.BaseEntity.encryptField('reply'),
    }),
    __metadata("design:type", String)
], SurveyAnswer.prototype, "reply", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'smallint',
        nullable: true,
    }),
    (0, typeorm_1.Column)({ type: 'smallint', nullable: true }),
    __metadata("design:type", Number)
], SurveyAnswer.prototype, "rating", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], SurveyAnswer.prototype, "survey_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], SurveyAnswer.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], SurveyAnswer.prototype, "completed", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => survey_entity_1.Survey, (survey) => survey.id),
    (0, typeorm_1.JoinColumn)({ name: 'survey_id' }),
    __metadata("design:type", survey_entity_1.Survey)
], SurveyAnswer.prototype, "survey", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.id),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], SurveyAnswer.prototype, "user", void 0);
exports.SurveyAnswer = SurveyAnswer = __decorate([
    (0, typeorm_1.Entity)('survey_answer'),
    __metadata("design:paramtypes", [Object, Object])
], SurveyAnswer);
//# sourceMappingURL=survey-answer.entity.js.map