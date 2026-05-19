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
exports.TeamToMember = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../user/entities/user.entity");
const team_entity_1 = require("./team.entity");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const invitation_status_enum_1 = require("../domain/invitation-status.enum");
let TeamToMember = class TeamToMember extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, teamToMember = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, teamToMember));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { team_id: { required: true, type: () => String }, member_id: { required: true, type: () => String }, first_name: { required: false, type: () => String }, last_name: { required: false, type: () => String }, member_expiry_date: { required: false, type: () => Date }, invitation_status: { required: true, enum: require("../domain/invitation-status.enum").InvitationStatus }, invitation_sent_at: { required: false, type: () => Date }, invitation_responded_at: { required: false, type: () => Date }, invitation_send_count: { required: true, type: () => Number }, email: { required: false, type: () => String }, member: { required: true, type: () => require("../../user/entities/user.entity").User }, team: { required: true, type: () => require("./team.entity").Team } };
    }
};
exports.TeamToMember = TeamToMember;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
        unique: false,
    }),
    __metadata("design:type", String)
], TeamToMember.prototype, "team_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
        unique: false,
    }),
    __metadata("design:type", String)
], TeamToMember.prototype, "member_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, unique: false, transformer: base_entity_entity_1.BaseEntity.encryptField('first_name') }),
    __metadata("design:type", String)
], TeamToMember.prototype, "first_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, unique: false, transformer: base_entity_entity_1.BaseEntity.encryptField('last_name') }),
    __metadata("design:type", String)
], TeamToMember.prototype, "last_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true, unique: false }),
    __metadata("design:type", Date)
], TeamToMember.prototype, "member_expiry_date", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 20,
        nullable: false,
        default: invitation_status_enum_1.InvitationStatus.PENDING,
    }),
    __metadata("design:type", String)
], TeamToMember.prototype, "invitation_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true, default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], TeamToMember.prototype, "invitation_sent_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], TeamToMember.prototype, "invitation_responded_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], TeamToMember.prototype, "invitation_send_count", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, unique: false, transformer: base_entity_entity_1.BaseEntity.encryptField('email') }),
    __metadata("design:type", String)
], TeamToMember.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (member) => member.teamToMember, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'member_id' }),
    __metadata("design:type", user_entity_1.User)
], TeamToMember.prototype, "member", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => team_entity_1.Team, (team) => team.teamToMember, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'team_id' }),
    __metadata("design:type", team_entity_1.Team)
], TeamToMember.prototype, "team", void 0);
exports.TeamToMember = TeamToMember = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object, Object])
], TeamToMember);
//# sourceMappingURL=team-to-member.entity.js.map