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
exports.Survey = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const answer_type_enum_1 = require("../domain/answer-type.enum");
const user_entity_1 = require("../../user/entities/user.entity");
let Survey = class Survey extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, survey = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, survey));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { question: { required: true, type: () => String }, choices: { required: false, type: () => [String] }, answer_type: { required: true, enum: require("../domain/answer-type.enum").AnswerType }, creator: { required: true, type: () => String }, user: { required: false, type: () => require("../../user/entities/user.entity").User } };
    }
};
exports.Survey = Survey;
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: false,
    }),
    __metadata("design:type", String)
], Survey.prototype, "question", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
    }),
    __metadata("design:type", Array)
], Survey.prototype, "choices", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: answer_type_enum_1.AnswerType,
        nullable: false,
    }),
    __metadata("design:type", String)
], Survey.prototype, "answer_type", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], Survey.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.id),
    (0, typeorm_1.JoinColumn)({ name: 'creator' }),
    __metadata("design:type", user_entity_1.User)
], Survey.prototype, "user", void 0);
exports.Survey = Survey = __decorate([
    (0, typeorm_1.Entity)('survey'),
    __metadata("design:paramtypes", [Object, Object])
], Survey);
//# sourceMappingURL=survey.entity.js.map