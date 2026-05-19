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
exports.UnlockRequest = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const accountability_buddy_entity_1 = require("./accountability-buddy.entity");
const unlock_request_status_enum_1 = require("../domain/unlock-request-status.enum");
let UnlockRequest = class UnlockRequest extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, request = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, request));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: true, type: () => String }, accountability_buddy_id: { required: true, type: () => String }, reason: { required: false, type: () => String }, status: { required: true, enum: require("../domain/unlock-request-status.enum").UnlockRequestStatus }, approved_at: { required: false, type: () => Date }, unlock_duration_minutes: { required: false, type: () => Number }, user: { required: false, type: () => require("../../user/entities/user.entity").User }, accountability_buddy: { required: false, type: () => require("./accountability-buddy.entity").AccountabilityBuddy } };
    }
};
exports.UnlockRequest = UnlockRequest;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], UnlockRequest.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], UnlockRequest.prototype, "accountability_buddy_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'text',
        nullable: true,
        transformer: base_entity_entity_1.BaseEntity.encryptField('reason'),
    }),
    __metadata("design:type", String)
], UnlockRequest.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 20,
        nullable: false,
        default: unlock_request_status_enum_1.UnlockRequestStatus.PENDING,
    }),
    __metadata("design:type", String)
], UnlockRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
        nullable: true,
    }),
    __metadata("design:type", Date)
], UnlockRequest.prototype, "approved_at", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'integer',
        nullable: true,
    }),
    __metadata("design:type", Number)
], UnlockRequest.prototype, "unlock_duration_minutes", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], UnlockRequest.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => accountability_buddy_entity_1.AccountabilityBuddy, (buddy) => buddy.unlock_requests, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'accountability_buddy_id' }),
    __metadata("design:type", accountability_buddy_entity_1.AccountabilityBuddy)
], UnlockRequest.prototype, "accountability_buddy", void 0);
exports.UnlockRequest = UnlockRequest = __decorate([
    (0, typeorm_1.Entity)('unlock_requests'),
    __metadata("design:paramtypes", [Object, Object])
], UnlockRequest);
//# sourceMappingURL=unlock-request.entity.js.map