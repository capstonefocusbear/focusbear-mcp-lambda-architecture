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
exports.AnnouncementEntity = exports.AnnouncementPriority = exports.AnnouncementType = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const operating_system_enum_1 = require("../../../shared/domain/operating-system.enum");
var AnnouncementType;
(function (AnnouncementType) {
    AnnouncementType["RELEASE"] = "release";
    AnnouncementType["EVENT"] = "event";
    AnnouncementType["SURVEY"] = "survey";
    AnnouncementType["MAINTENANCE"] = "maintenance";
})(AnnouncementType || (exports.AnnouncementType = AnnouncementType = {}));
var AnnouncementPriority;
(function (AnnouncementPriority) {
    AnnouncementPriority["LOW"] = "low";
    AnnouncementPriority["MEDIUM"] = "medium";
    AnnouncementPriority["HIGH"] = "high";
    AnnouncementPriority["CRITICAL"] = "critical";
})(AnnouncementPriority || (exports.AnnouncementPriority = AnnouncementPriority = {}));
let AnnouncementEntity = class AnnouncementEntity {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, type: { required: true, enum: require("./announcements.entity").AnnouncementType }, heading: { required: true, type: () => String }, details: { required: true, type: () => String }, details_url: { required: false, type: () => String }, expiry_date: { required: true, type: () => Date }, priority: { required: true, enum: require("./announcements.entity").AnnouncementPriority }, operating_system: { required: true, enum: require("../../../shared/domain/operating-system.enum").OperatingSystem }, created_at: { required: true, type: () => Date }, updated_at: { required: true, type: () => Date } };
    }
};
exports.AnnouncementEntity = AnnouncementEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)('varchar'),
    __metadata("design:type", String)
], AnnouncementEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: AnnouncementType,
    }),
    __metadata("design:type", String)
], AnnouncementEntity.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], AnnouncementEntity.prototype, "heading", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], AnnouncementEntity.prototype, "details", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], AnnouncementEntity.prototype, "details_url", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], AnnouncementEntity.prototype, "expiry_date", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: AnnouncementPriority,
        default: AnnouncementPriority.MEDIUM,
    }),
    __metadata("design:type", String)
], AnnouncementEntity.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: operating_system_enum_1.OperatingSystem,
        default: operating_system_enum_1.OperatingSystem.Unknown,
    }),
    __metadata("design:type", String)
], AnnouncementEntity.prototype, "operating_system", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AnnouncementEntity.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], AnnouncementEntity.prototype, "updated_at", void 0);
exports.AnnouncementEntity = AnnouncementEntity = __decorate([
    (0, typeorm_1.Entity)('announcements')
], AnnouncementEntity);
//# sourceMappingURL=announcements.entity.js.map