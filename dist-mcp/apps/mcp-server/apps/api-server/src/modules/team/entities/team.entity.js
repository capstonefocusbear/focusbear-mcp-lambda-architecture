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
exports.Team = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const team_to_member_entity_1 = require("./team-to-member.entity");
const team_to_admin_entity_1 = require("./team-to-admin.entity");
const payment_type_enum_1 = require("../domain/payment-type.enum");
let Team = class Team extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, team = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, team));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { owner_id: { required: false, type: () => String }, team_size: { required: false, type: () => Number }, team_size_limit: { required: false, type: () => Number }, is_active: { required: false, type: () => Boolean }, expires_date: { required: false, type: () => Object }, stripe_data: { required: false, type: () => Object }, stripe_subscription_id: { required: false, type: () => String }, name: { required: false, type: () => String }, payment_type: { required: false, type: () => String }, owner: { required: false, type: () => require("../../user/entities/user.entity").User }, teamToMember: { required: false, type: () => [require("./team-to-member.entity").TeamToMember] }, teamToAdmin: { required: false, type: () => [require("./team-to-admin.entity").TeamToAdmin] } };
    }
};
exports.Team = Team;
__decorate([
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
        unique: false,
    }),
    __metadata("design:type", String)
], Team.prototype, "owner_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'integer',
        nullable: false,
        default: 1,
    }),
    __metadata("design:type", Number)
], Team.prototype, "team_size", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'integer',
        nullable: true,
        default: 1,
    }),
    __metadata("design:type", Number)
], Team.prototype, "team_size_limit", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        nullable: false,
        default: true,
    }),
    __metadata("design:type", Boolean)
], Team.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
        nullable: false,
    }),
    __metadata("design:type", Object)
], Team.prototype, "expires_date", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        nullable: true,
        transformer: base_entity_entity_1.BaseEntity.encryptJSONField('stripe_data'),
    }),
    __metadata("design:type", Object)
], Team.prototype, "stripe_data", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: true,
    }),
    __metadata("design:type", String)
], Team.prototype, "stripe_subscription_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: true,
    }),
    __metadata("design:type", String)
], Team.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: true,
        default: payment_type_enum_1.PaymentType.STRIPE,
    }),
    __metadata("design:type", String)
], Team.prototype, "payment_type", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.owned_teams, { onDelete: 'SET NULL', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'owner_id' }),
    __metadata("design:type", user_entity_1.User)
], Team.prototype, "owner", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => team_to_member_entity_1.TeamToMember, (teamToMember) => teamToMember.team),
    __metadata("design:type", Array)
], Team.prototype, "teamToMember", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => team_to_admin_entity_1.TeamToAdmin, (teamToAdmin) => teamToAdmin.team),
    __metadata("design:type", Array)
], Team.prototype, "teamToAdmin", void 0);
exports.Team = Team = __decorate([
    (0, typeorm_1.Entity)('teams'),
    __metadata("design:paramtypes", [Object, Object])
], Team);
//# sourceMappingURL=team.entity.js.map