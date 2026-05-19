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
exports.AccountabilityBuddy = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const invitation_status_enum_1 = require("../domain/invitation-status.enum");
const unlock_request_entity_1 = require("./unlock-request.entity");
let AccountabilityBuddy = class AccountabilityBuddy extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, buddy = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, buddy));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: true, type: () => String }, buddy_user_id: { required: false, type: () => String }, buddy_email: { required: true, type: () => String }, invitation_status: { required: true, enum: require("../domain/invitation-status.enum").InvitationStatus }, invitation_sent_at: { required: false, type: () => Date }, invitation_responded_at: { required: false, type: () => Date }, user: { required: false, type: () => require("../../user/entities/user.entity").User }, buddy: { required: false, type: () => require("../../user/entities/user.entity").User }, unlock_requests: { required: false, type: () => [require("./unlock-request.entity").UnlockRequest] } };
    }
};
exports.AccountabilityBuddy = AccountabilityBuddy;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], AccountabilityBuddy.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
    }),
    __metadata("design:type", String)
], AccountabilityBuddy.prototype, "buddy_user_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 255,
        nullable: true,
        transformer: base_entity_entity_1.BaseEntity.encryptField('buddy_email'),
    }),
    __metadata("design:type", String)
], AccountabilityBuddy.prototype, "buddy_email", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 20,
        nullable: false,
        default: invitation_status_enum_1.InvitationStatus.PENDING,
    }),
    __metadata("design:type", String)
], AccountabilityBuddy.prototype, "invitation_status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], AccountabilityBuddy.prototype, "invitation_sent_at", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
        nullable: true,
    }),
    __metadata("design:type", Date)
], AccountabilityBuddy.prototype, "invitation_responded_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.accountability_buddies, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], AccountabilityBuddy.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'buddy_user_id' }),
    __metadata("design:type", user_entity_1.User)
], AccountabilityBuddy.prototype, "buddy", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => unlock_request_entity_1.UnlockRequest, (unlockRequest) => unlockRequest.accountability_buddy),
    __metadata("design:type", Array)
], AccountabilityBuddy.prototype, "unlock_requests", void 0);
exports.AccountabilityBuddy = AccountabilityBuddy = __decorate([
    (0, typeorm_1.Entity)('accountability_buddy'),
    __metadata("design:paramtypes", [Object, Object])
], AccountabilityBuddy);
//# sourceMappingURL=accountability-buddy.entity.js.map