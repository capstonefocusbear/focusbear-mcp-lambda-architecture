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
exports.BlockingSchedule = exports.BlockLevel = exports.PauseFriction = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const focus_mode_entity_1 = require("./focus-mode.entity");
var PauseFriction;
(function (PauseFriction) {
    PauseFriction["NONE"] = "none";
    PauseFriction["TIMER"] = "timer";
    PauseFriction["RANDOM_CHARS"] = "100_random_chars";
    PauseFriction["PASSWORD"] = "password";
})(PauseFriction || (exports.PauseFriction = PauseFriction = {}));
var BlockLevel;
(function (BlockLevel) {
    BlockLevel["GENTLE"] = "gentle";
    BlockLevel["STRICT"] = "strict";
    BlockLevel["SUPER_STRICT"] = "super-strict";
})(BlockLevel || (exports.BlockLevel = BlockLevel = {}));
let BlockingSchedule = class BlockingSchedule extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, data = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, data));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: false, type: () => String }, name: { required: false, type: () => String }, start_time: { required: false, type: () => String }, end_time: { required: false, type: () => String }, days_of_week: { required: false, type: () => [Number] }, focus_mode_id: { required: false, type: () => String }, pause_friction: { required: false, enum: require("./blocking-schedule.entity").PauseFriction }, block_level: { required: false, enum: require("./blocking-schedule.entity").BlockLevel }, is_ai_blocking_enabled: { required: false, type: () => Boolean }, metadata: { required: false, type: () => Object }, user: { required: false, type: () => require("../../user/entities/user.entity").User }, focus_mode: { required: false, type: () => require("./focus-mode.entity").FocusMode } };
    }
};
exports.BlockingSchedule = BlockingSchedule;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], BlockingSchedule.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 255,
        nullable: false,
    }),
    __metadata("design:type", String)
], BlockingSchedule.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'time',
        nullable: false,
    }),
    __metadata("design:type", String)
], BlockingSchedule.prototype, "start_time", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'time',
        nullable: false,
    }),
    __metadata("design:type", String)
], BlockingSchedule.prototype, "end_time", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        nullable: false,
    }),
    __metadata("design:type", Array)
], BlockingSchedule.prototype, "days_of_week", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], BlockingSchedule.prototype, "focus_mode_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PauseFriction,
        default: PauseFriction.NONE,
    }),
    __metadata("design:type", String)
], BlockingSchedule.prototype, "pause_friction", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: BlockLevel,
        default: BlockLevel.STRICT,
    }),
    __metadata("design:type", String)
], BlockingSchedule.prototype, "block_level", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], BlockingSchedule.prototype, "is_ai_blocking_enabled", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        nullable: true,
    }),
    __metadata("design:type", Object)
], BlockingSchedule.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.blocking_schedules, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], BlockingSchedule.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => focus_mode_entity_1.FocusMode, (focus_mode) => focus_mode.blocking_schedules, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'focus_mode_id' }),
    __metadata("design:type", focus_mode_entity_1.FocusMode)
], BlockingSchedule.prototype, "focus_mode", void 0);
exports.BlockingSchedule = BlockingSchedule = __decorate([
    (0, typeorm_1.Entity)('blocking_schedules'),
    __metadata("design:paramtypes", [Object, Object])
], BlockingSchedule);
//# sourceMappingURL=blocking-schedule.entity.js.map