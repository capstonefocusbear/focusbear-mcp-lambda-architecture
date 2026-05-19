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
exports.SavedWebsite = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
let SavedWebsite = class SavedWebsite extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, urlData = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, urlData));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: true, type: () => String }, url: { required: true, type: () => String }, title: { required: false, type: () => String }, metadata: { required: true, type: () => Object }, note: { required: false, type: () => String }, user: { required: false, type: () => require("../../user/entities/user.entity").User } };
    }
};
exports.SavedWebsite = SavedWebsite;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], SavedWebsite.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: false, transformer: base_entity_entity_1.BaseEntity.encryptField('url') }),
    __metadata("design:type", String)
], SavedWebsite.prototype, "url", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, transformer: base_entity_entity_1.BaseEntity.encryptField('title') }),
    __metadata("design:type", String)
], SavedWebsite.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: null, nullable: true }),
    __metadata("design:type", Object)
], SavedWebsite.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, transformer: base_entity_entity_1.BaseEntity.encryptField('note') }),
    __metadata("design:type", String)
], SavedWebsite.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.saved_websites, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], SavedWebsite.prototype, "user", void 0);
exports.SavedWebsite = SavedWebsite = __decorate([
    (0, typeorm_1.Entity)('saved_websites_for_relax_block'),
    __metadata("design:paramtypes", [Object, Object])
], SavedWebsite);
//# sourceMappingURL=saved-website.entity.js.map