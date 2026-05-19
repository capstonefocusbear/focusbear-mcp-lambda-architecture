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
exports.ProjectMember = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const project_entity_1 = require("./project.entity");
const project_member_role_enum_1 = require("../domain/project-member-role.enum");
const project_member_invitation_status_enum_1 = require("../domain/project-member-invitation-status.enum");
let ProjectMember = class ProjectMember extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, data = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, data));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { project_id: { required: true, type: () => String }, user_id: { required: false, type: () => String }, email: { required: false, type: () => String }, role: { required: true, enum: require("../domain/project-member-role.enum").ProjectMemberRole }, invitation_status: { required: true, enum: require("../domain/project-member-invitation-status.enum").ProjectMemberInvitationStatus }, invitation_sent_at: { required: false, type: () => Date }, invitation_responded_at: { required: false, type: () => Date }, project: { required: false, type: () => require("./project.entity").Project }, user: { required: false, type: () => require("../../user/entities/user.entity").User } };
    }
};
exports.ProjectMember = ProjectMember;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], ProjectMember.prototype, "project_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
    }),
    __metadata("design:type", String)
], ProjectMember.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 255,
        nullable: true,
        transformer: base_entity_entity_1.BaseEntity.encryptField('email'),
    }),
    __metadata("design:type", String)
], ProjectMember.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: project_member_role_enum_1.ProjectMemberRole,
        default: project_member_role_enum_1.ProjectMemberRole.MEMBER,
    }),
    __metadata("design:type", String)
], ProjectMember.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: project_member_invitation_status_enum_1.ProjectMemberInvitationStatus,
        default: project_member_invitation_status_enum_1.ProjectMemberInvitationStatus.PENDING,
    }),
    __metadata("design:type", String)
], ProjectMember.prototype, "invitation_status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], ProjectMember.prototype, "invitation_sent_at", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
        nullable: true,
    }),
    __metadata("design:type", Date)
], ProjectMember.prototype, "invitation_responded_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.Project, (project) => project.members, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'project_id' }),
    __metadata("design:type", project_entity_1.Project)
], ProjectMember.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], ProjectMember.prototype, "user", void 0);
exports.ProjectMember = ProjectMember = __decorate([
    (0, typeorm_1.Entity)('project_members'),
    __metadata("design:paramtypes", [Object, Object])
], ProjectMember);
//# sourceMappingURL=project-member.entity.js.map