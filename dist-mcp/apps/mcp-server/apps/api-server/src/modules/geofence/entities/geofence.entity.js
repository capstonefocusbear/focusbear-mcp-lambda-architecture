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
exports.Geofence = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const activity_sequence_entity_1 = require("../../activity/entities/activity-sequence.entity");
let Geofence = class Geofence extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, geofenceData = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, geofenceData));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: true, type: () => String }, name: { required: true, type: () => String }, latitude: { required: true, type: () => String }, longitude: { required: true, type: () => String }, radius: { required: true, type: () => Number }, trigger_after_time: { required: false, type: () => String }, associated_routine_id: { required: false, type: () => String }, user: { required: false, type: () => require("../../user/entities/user.entity").User }, associated_routine: { required: false, type: () => require("../../activity/entities/activity-sequence.entity").ActivitySequence } };
    }
};
exports.Geofence = Geofence;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], Geofence.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: false,
        transformer: base_entity_entity_1.BaseEntity.encryptField('geofence_name'),
    }),
    __metadata("design:type", String)
], Geofence.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: false,
        transformer: base_entity_entity_1.BaseEntity.encryptField('geofence_latitude'),
    }),
    __metadata("design:type", String)
], Geofence.prototype, "latitude", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: false,
        transformer: base_entity_entity_1.BaseEntity.encryptField('geofence_longitude'),
    }),
    __metadata("design:type", String)
], Geofence.prototype, "longitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 100 }),
    __metadata("design:type", Number)
], Geofence.prototype, "radius", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'time', nullable: true }),
    __metadata("design:type", String)
], Geofence.prototype, "trigger_after_time", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Geofence.prototype, "associated_routine_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], Geofence.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => activity_sequence_entity_1.ActivitySequence, { onDelete: 'SET NULL', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'associated_routine_id' }),
    __metadata("design:type", activity_sequence_entity_1.ActivitySequence)
], Geofence.prototype, "associated_routine", void 0);
exports.Geofence = Geofence = __decorate([
    (0, typeorm_1.Entity)('geofences'),
    __metadata("design:paramtypes", [Object, Object])
], Geofence);
//# sourceMappingURL=geofence.entity.js.map