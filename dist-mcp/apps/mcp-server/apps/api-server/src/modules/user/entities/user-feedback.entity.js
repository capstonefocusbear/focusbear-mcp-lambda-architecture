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
exports.UserFeedback = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("./user.entity");
const numeric_column_transformer_1 = require("../../../shared/transformers/numeric-column-transformer");
let UserFeedback = class UserFeedback extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, userFeedback = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, userFeedback));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: false, type: () => String }, rating: { required: false, type: () => Number }, feedback: { required: false, type: () => String }, metadata: { required: false, type: () => Object }, user: { required: false, type: () => require("./user.entity").User } };
    }
};
exports.UserFeedback = UserFeedback;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], UserFeedback.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        nullable: false,
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], UserFeedback.prototype, "rating", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 2500,
        nullable: true,
    }),
    __metadata("design:type", String)
], UserFeedback.prototype, "feedback", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        nullable: true,
    }),
    __metadata("design:type", Object)
], UserFeedback.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.feedback, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], UserFeedback.prototype, "user", void 0);
exports.UserFeedback = UserFeedback = __decorate([
    (0, typeorm_1.Entity)('user_feedback'),
    __metadata("design:paramtypes", [Object, Object])
], UserFeedback);
//# sourceMappingURL=user-feedback.entity.js.map