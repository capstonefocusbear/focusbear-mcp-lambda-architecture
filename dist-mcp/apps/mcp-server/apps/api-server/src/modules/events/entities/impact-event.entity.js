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
exports.ImpactEvent = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const impact_category_enum_1 = require("../../activity/domain/impact-category.enum");
const numeric_column_transformer_1 = require("../../../shared/transformers/numeric-column-transformer");
let ImpactEvent = class ImpactEvent extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, event = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, event));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: false, type: () => String }, impact_category: { required: false, enum: require("../../activity/domain/impact-category.enum").ImpactCategory }, quantity: { required: false, type: () => Number }, user: { required: false, type: () => require("../../user/entities/user.entity").User } };
    }
};
exports.ImpactEvent = ImpactEvent;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], ImpactEvent.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        name: 'impact_category',
        enum: impact_category_enum_1.ImpactCategory,
        nullable: true,
        default: null,
    }),
    __metadata("design:type", String)
], ImpactEvent.prototype, "impact_category", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        nullable: true,
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], ImpactEvent.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.impact_events, { onDelete: 'SET NULL', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], ImpactEvent.prototype, "user", void 0);
exports.ImpactEvent = ImpactEvent = __decorate([
    (0, typeorm_1.Entity)('impact_events'),
    __metadata("design:paramtypes", [Object, Object])
], ImpactEvent);
//# sourceMappingURL=impact-event.entity.js.map