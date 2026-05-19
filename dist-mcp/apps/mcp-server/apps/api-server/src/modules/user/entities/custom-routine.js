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
exports.CustomRoutine = void 0;
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const days_of_week_enum_1 = require("../../activity/domain/days-of-week.enum");
const custom_routine_trigger_enum_1 = require("../domain/custom-routine-trigger.enum");
const user_entity_1 = require("./user.entity");
const activity_sequence_entity_1 = require("../../activity/entities/activity-sequence.entity");
let CustomRoutine = class CustomRoutine extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, rest = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, rest));
    }
};
exports.CustomRoutine = CustomRoutine;
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: false,
        transformer: base_entity_entity_1.BaseEntity.encryptField('name'),
    }),
    __metadata("design:type", String)
], CustomRoutine.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: custom_routine_trigger_enum_1.CustomRoutineTrigger,
        default: custom_routine_trigger_enum_1.CustomRoutineTrigger.ON_DEMAND,
        nullable: false,
    }),
    __metadata("design:type", String)
], CustomRoutine.prototype, "trigger", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        nullable: false,
        default: [days_of_week_enum_1.DaysOfWeek.ALL],
        transformer: base_entity_entity_1.BaseEntity.encryptJSONField('days_of_week'),
    }),
    __metadata("design:type", Array)
], CustomRoutine.prototype, "days_of_week", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 255,
    }),
    __metadata("design:type", String)
], CustomRoutine.prototype, "start_time", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 255,
    }),
    __metadata("design:type", String)
], CustomRoutine.prototype, "end_time", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], CustomRoutine.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.custom_routines, { onDelete: 'SET NULL', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], CustomRoutine.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => activity_sequence_entity_1.ActivitySequence, (activity_sequence) => activity_sequence.custom_routine_id),
    __metadata("design:type", Array)
], CustomRoutine.prototype, "activitySequences", void 0);
exports.CustomRoutine = CustomRoutine = __decorate([
    (0, typeorm_1.Entity)('custom_routines'),
    __metadata("design:paramtypes", [Object, Object])
], CustomRoutine);
//# sourceMappingURL=custom-routine.js.map