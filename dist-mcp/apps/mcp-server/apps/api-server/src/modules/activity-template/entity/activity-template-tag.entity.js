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
exports.ActivityTemplateTag = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const activity_template_entity_1 = require("./activity-template.entity");
let ActivityTemplateTag = class ActivityTemplateTag extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, activityTemplateTag = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, activityTemplateTag));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { tags: { required: true, type: () => [String] }, activity_template_id: { required: true, type: () => String }, activity_template: { required: false, type: () => require("./activity-template.entity").ActivityTemplate } };
    }
};
exports.ActivityTemplateTag = ActivityTemplateTag;
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
    }),
    __metadata("design:type", Array)
], ActivityTemplateTag.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        unique: true,
        nullable: false,
    }),
    __metadata("design:type", String)
], ActivityTemplateTag.prototype, "activity_template_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => activity_template_entity_1.ActivityTemplate, (activityTemplate) => activityTemplate.tags, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'activity_template_id' }),
    __metadata("design:type", activity_template_entity_1.ActivityTemplate)
], ActivityTemplateTag.prototype, "activity_template", void 0);
exports.ActivityTemplateTag = ActivityTemplateTag = __decorate([
    (0, typeorm_1.Entity)('activity_template_tag'),
    __metadata("design:paramtypes", [Object, Object])
], ActivityTemplateTag);
//# sourceMappingURL=activity-template-tag.entity.js.map