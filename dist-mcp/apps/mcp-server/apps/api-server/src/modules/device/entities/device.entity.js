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
exports.Device = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const device_metadata_model_1 = require("../domain/device-metadata.model");
const operating_system_enum_1 = require("../../../shared/domain/operating-system.enum");
let Device = class Device extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, device = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign(Object.assign({}, device), { is_leader: !!device.is_leader }));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: false, type: () => String }, operating_system: { required: false, enum: require("../../../shared/domain/operating-system.enum").OperatingSystem }, is_leader: { required: false, type: () => Boolean }, app_version: { required: false, type: () => String }, metadata: { required: false, type: () => require("../domain/device-metadata.model").DeviceMetadata }, user: { required: false, type: () => require("../../user/entities/user.entity").User } };
    }
};
exports.Device = Device;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], Device.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: operating_system_enum_1.OperatingSystem,
        nullable: false,
    }),
    __metadata("design:type", String)
], Device.prototype, "operating_system", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'boolean',
        nullable: false,
        default: false,
    }),
    __metadata("design:type", Boolean)
], Device.prototype, "is_leader", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: true,
    }),
    __metadata("design:type", String)
], Device.prototype, "app_version", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        transformer: base_entity_entity_1.BaseEntity.encryptJSONField('metadata'),
    }),
    __metadata("design:type", device_metadata_model_1.DeviceMetadata)
], Device.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.devices, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], Device.prototype, "user", void 0);
exports.Device = Device = __decorate([
    (0, typeorm_1.Entity)('devices'),
    __metadata("design:paramtypes", [Object, Object])
], Device);
//# sourceMappingURL=device.entity.js.map