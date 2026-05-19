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
exports.VideoMetadata = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
let VideoMetadata = class VideoMetadata extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, video = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        this.thumbnail_url = null;
        this.thumbnail_width = null;
        this.thumbnail_height = null;
        Object.assign(this, Object.assign({}, video));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: false, type: () => String }, video_url: { required: false, type: () => String }, title: { required: false, type: () => String }, duration: { required: false, type: () => String }, thumbnail_url: { required: true, type: () => String, nullable: true, default: null }, thumbnail_width: { required: true, type: () => Number, nullable: true, default: null }, thumbnail_height: { required: true, type: () => Number, nullable: true, default: null } };
    }
};
exports.VideoMetadata = VideoMetadata;
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: false,
        unique: true,
    }),
    __metadata("design:type", String)
], VideoMetadata.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: false,
    }),
    __metadata("design:type", String)
], VideoMetadata.prototype, "video_url", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: false,
    }),
    __metadata("design:type", String)
], VideoMetadata.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: false,
    }),
    __metadata("design:type", String)
], VideoMetadata.prototype, "duration", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: true,
    }),
    __metadata("design:type", String)
], VideoMetadata.prototype, "thumbnail_url", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'integer',
        nullable: true,
    }),
    __metadata("design:type", Number)
], VideoMetadata.prototype, "thumbnail_width", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'integer',
        nullable: true,
    }),
    __metadata("design:type", Number)
], VideoMetadata.prototype, "thumbnail_height", void 0);
exports.VideoMetadata = VideoMetadata = __decorate([
    (0, typeorm_1.Entity)('video_metadata'),
    __metadata("design:paramtypes", [Object, Object])
], VideoMetadata);
//# sourceMappingURL=video-metadata.entity.js.map