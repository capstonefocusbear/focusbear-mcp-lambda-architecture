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
exports.Tutorial = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const activity_entity_1 = require("./activity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const activity_template_entity_1 = require("../../activity-template/entity/activity-template.entity");
let Tutorial = class Tutorial extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, data = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, data));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { activity_id: { required: true, type: () => String }, user_id: { required: true, type: () => String }, activity_template_id: { required: false, type: () => String }, activity: { required: false, type: () => require("./activity.entity").Activity }, user: { required: true, type: () => require("../../user/entities/user.entity").User }, activity_template: { required: false, type: () => require("../../activity-template/entity/activity-template.entity").ActivityTemplate } };
    }
};
exports.Tutorial = Tutorial;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], Tutorial.prototype, "activity_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], Tutorial.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
    }),
    __metadata("design:type", String)
], Tutorial.prototype, "activity_template_id", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => activity_entity_1.Activity, (activity) => activity.tutorial, {
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'activity_id' }),
    __metadata("design:type", activity_entity_1.Activity)
], Tutorial.prototype, "activity", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => user_entity_1.User, (user) => user.tutorials),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], Tutorial.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => activity_template_entity_1.ActivityTemplate, (activityTemplate) => activityTemplate.tutorial, {
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'activity_template_id' }),
    __metadata("design:type", activity_template_entity_1.ActivityTemplate)
], Tutorial.prototype, "activity_template", void 0);
exports.Tutorial = Tutorial = __decorate([
    (0, typeorm_1.Entity)('tutorials'),
    __metadata("design:paramtypes", [Object, Object])
], Tutorial);
//# sourceMappingURL=tutorial.entity.js.map