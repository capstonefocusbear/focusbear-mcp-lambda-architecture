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
exports.TeamJoinCode = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const team_entity_1 = require("./team.entity");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
let TeamJoinCode = class TeamJoinCode extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, teamJoinCode = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, teamJoinCode));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { team_id: { required: true, type: () => String }, code: { required: true, type: () => String }, is_active: { required: true, type: () => Boolean }, max_redemptions: { required: true, type: () => Number }, redemption_count: { required: true, type: () => Number }, expires_at: { required: true, type: () => Date }, created_by: { required: true, type: () => String }, team: { required: true, type: () => require("./team.entity").Team } };
    }
};
exports.TeamJoinCode = TeamJoinCode;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], TeamJoinCode.prototype, "team_id", void 0);
__decorate([
    (0, typeorm_1.Index)({ unique: true }),
    (0, typeorm_1.Column)({ type: 'varchar', nullable: false }),
    __metadata("design:type", String)
], TeamJoinCode.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', nullable: false, default: true }),
    __metadata("design:type", Boolean)
], TeamJoinCode.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], TeamJoinCode.prototype, "max_redemptions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], TeamJoinCode.prototype, "redemption_count", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], TeamJoinCode.prototype, "expires_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], TeamJoinCode.prototype, "created_by", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => team_entity_1.Team, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'team_id' }),
    __metadata("design:type", team_entity_1.Team)
], TeamJoinCode.prototype, "team", void 0);
exports.TeamJoinCode = TeamJoinCode = __decorate([
    (0, typeorm_1.Entity)('team_join_codes'),
    __metadata("design:paramtypes", [Object, Object])
], TeamJoinCode);
//# sourceMappingURL=team-join-code.entity.js.map