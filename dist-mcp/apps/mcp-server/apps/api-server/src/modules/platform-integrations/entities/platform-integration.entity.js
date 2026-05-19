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
exports.PlatformIntegration = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const helpers_1 = require("../../../shared/utils/helpers");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const platform_integration_metadata_dto_1 = require("../dto/platform-integration-metadata.dto");
let PlatformIntegration = class PlatformIntegration extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, platformData = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, platformData));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: false, type: () => String }, platform: { required: false, type: () => String }, external_user_id: { required: false, type: () => String }, data: { required: false, type: () => require("../dto/platform-integration-metadata.dto").PlatformIntegrationMetadataDto }, only_assigned: { required: false, type: () => Boolean }, user: { required: false, type: () => require("../../user/entities/user.entity").User } };
    }
};
exports.PlatformIntegration = PlatformIntegration;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
        unique: false,
    }),
    __metadata("design:type", String)
], PlatformIntegration.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: true,
    }),
    __metadata("design:type", String)
], PlatformIntegration.prototype, "platform", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: true,
        transformer: helpers_1.FieldTransformer,
    }),
    __metadata("design:type", String)
], PlatformIntegration.prototype, "external_user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        nullable: true,
        transformer: base_entity_entity_1.BaseEntity.encryptJSONField('data'),
    }),
    __metadata("design:type", platform_integration_metadata_dto_1.PlatformIntegrationMetadataDto)
], PlatformIntegration.prototype, "data", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], PlatformIntegration.prototype, "only_assigned", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.platform_integrations, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], PlatformIntegration.prototype, "user", void 0);
exports.PlatformIntegration = PlatformIntegration = __decorate([
    (0, typeorm_1.Entity)('platform_integrations'),
    __metadata("design:paramtypes", [Object, Object])
], PlatformIntegration);
//# sourceMappingURL=platform-integration.entity.js.map