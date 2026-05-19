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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementViewEntity = exports.ViewAction = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const announcements_entity_1 = require("./announcements.entity");
var ViewAction;
(function (ViewAction) {
    ViewAction["VIEWED"] = "viewed";
    ViewAction["DISMISSED"] = "dismissed";
})(ViewAction || (exports.ViewAction = ViewAction = {}));
let AnnouncementViewEntity = class AnnouncementViewEntity {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, user_id: { required: true, type: () => String }, announcement_id: { required: true, type: () => String }, action: { required: true, enum: require("./announcement-views.entity").ViewAction }, source: { required: true, type: () => String }, read_at: { required: true, type: () => Date }, created_at: { required: true, type: () => Date }, announcement: { required: true, type: () => require("./announcements.entity").AnnouncementEntity } };
    }
};
exports.AnnouncementViewEntity = AnnouncementViewEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AnnouncementViewEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], AnnouncementViewEntity.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], AnnouncementViewEntity.prototype, "announcement_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ViewAction,
        default: ViewAction.VIEWED,
    }),
    __metadata("design:type", String)
], AnnouncementViewEntity.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AnnouncementViewEntity.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'read_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], AnnouncementViewEntity.prototype, "read_at", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], AnnouncementViewEntity.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => announcements_entity_1.AnnouncementEntity),
    (0, typeorm_1.JoinColumn)({ name: 'announcement_id' }),
    __metadata("design:type", announcements_entity_1.AnnouncementEntity)
], AnnouncementViewEntity.prototype, "announcement", void 0);
exports.AnnouncementViewEntity = AnnouncementViewEntity = __decorate([
    (0, typeorm_1.Entity)('announcement_views'),
    (0, typeorm_1.Index)(['user_id', 'announcement_id'], { unique: true }),
    (0, typeorm_1.Index)(['user_id'])
], AnnouncementViewEntity);
//# sourceMappingURL=announcement-views.entity.js.map