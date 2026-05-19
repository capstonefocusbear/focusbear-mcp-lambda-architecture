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
exports.Calendar = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const helpers_1 = require("../../../shared/utils/helpers");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const calendar_platforms_enum_1 = require("../../platform-integrations/domain/calendar-platforms.enum");
let Calendar = class Calendar extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, event = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, event));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: false, type: () => String }, platform: { required: false, enum: require("../../platform-integrations/domain/calendar-platforms.enum").CalendarPlatforms }, platform_account: { required: false, type: () => String }, calendar_id: { required: false, type: () => String }, summary: { required: false, type: () => String }, is_selected: { required: false, type: () => Boolean }, user: { required: false, type: () => require("../../user/entities/user.entity").User } };
    }
};
exports.Calendar = Calendar;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], Calendar.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 255,
    }),
    __metadata("design:type", String)
], Calendar.prototype, "platform", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 255,
        transformer: helpers_1.FieldTransformer,
    }),
    __metadata("design:type", String)
], Calendar.prototype, "platform_account", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 255,
        transformer: helpers_1.FieldTransformer,
    }),
    __metadata("design:type", String)
], Calendar.prototype, "calendar_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 1000,
        transformer: helpers_1.FieldTransformer,
    }),
    __metadata("design:type", String)
], Calendar.prototype, "summary", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], Calendar.prototype, "is_selected", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.calendars, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], Calendar.prototype, "user", void 0);
exports.Calendar = Calendar = __decorate([
    (0, typeorm_1.Entity)('calendars'),
    __metadata("design:paramtypes", [Object, Object])
], Calendar);
//# sourceMappingURL=calendar.entity.js.map