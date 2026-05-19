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
exports.UpdateCustomRoutineDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const luxon_1 = require("luxon");
const days_of_week_enum_1 = require("../../activity/domain/days-of-week.enum");
const update_activity_dto_1 = require("../../activity/dto/update-activity.dto");
const custom_routine_trigger_enum_1 = require("../domain/custom-routine-trigger.enum");
function IsEndTimeAfterStartTime(validationOptions) {
    return (object, propertyName) => {
        (0, class_validator_1.registerDecorator)({
            name: 'IsEndTimeAfterStartTime',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value, args) {
                    const payload = args.object;
                    const startTime = payload.start_time;
                    const endTime = value;
                    if (!startTime || !endTime) {
                        return true;
                    }
                    const start = luxon_1.DateTime.fromFormat(startTime, 'HH:mm');
                    const end = luxon_1.DateTime.fromFormat(endTime, 'HH:mm');
                    if (!start.isValid || !end.isValid) {
                        return false;
                    }
                    return end > start;
                },
                defaultMessage() {
                    return 'end_time must be later than start_time.';
                },
            },
        });
    };
}
class UpdateCustomRoutineDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: false, type: () => String }, name: { required: true, type: () => String }, trigger: { required: true, enum: require("../domain/custom-routine-trigger.enum").CustomRoutineTrigger }, days_of_week: { required: false, enum: require("../../activity/domain/days-of-week.enum").DaysOfWeek, isArray: true }, start_time: { required: false, type: () => String }, end_time: { required: false, type: () => String }, standalone_activities: { required: false, type: () => [require("../../activity/dto/update-activity.dto").UpdateActivityDto] }, activity_sequence_id: { required: false, type: () => String, format: "uuid" } };
    }
}
exports.UpdateCustomRoutineDto = UpdateCustomRoutineDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UpdateCustomRoutineDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UpdateCustomRoutineDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsEnum)(custom_routine_trigger_enum_1.CustomRoutineTrigger),
    __metadata("design:type", String)
], UpdateCustomRoutineDto.prototype, "trigger", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value, obj }) => {
        if (obj.trigger === custom_routine_trigger_enum_1.CustomRoutineTrigger.ON_DEMAND) {
            const updatedObj = Object.assign(Object.assign({}, obj), { days_of_week: undefined });
            Object.assign(obj, updatedObj);
        }
        return value;
    }),
    (0, class_validator_1.ValidateIf)((o) => o.trigger === custom_routine_trigger_enum_1.CustomRoutineTrigger.ON_SCHEDULE),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(days_of_week_enum_1.DaysOfWeek, { each: true }),
    (0, swagger_1.ApiProperty)({ isArray: true, enum: days_of_week_enum_1.DaysOfWeek }),
    __metadata("design:type", Array)
], UpdateCustomRoutineDto.prototype, "days_of_week", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value, obj }) => {
        if (obj.trigger === custom_routine_trigger_enum_1.CustomRoutineTrigger.ON_DEMAND) {
            const updatedObj = Object.assign(Object.assign({}, obj), { start_time: undefined });
            Object.assign(obj, updatedObj);
        }
        return value;
    }),
    (0, class_validator_1.ValidateIf)((o) => o.trigger === custom_routine_trigger_enum_1.CustomRoutineTrigger.ON_SCHEDULE),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsMilitaryTime)(),
    __metadata("design:type", String)
], UpdateCustomRoutineDto.prototype, "start_time", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value, obj }) => {
        if (obj.trigger === custom_routine_trigger_enum_1.CustomRoutineTrigger.ON_DEMAND) {
            const updatedObj = Object.assign(Object.assign({}, obj), { end_time: undefined });
            Object.assign(obj, updatedObj);
        }
        return value;
    }),
    (0, class_validator_1.ValidateIf)((o) => o.trigger === custom_routine_trigger_enum_1.CustomRoutineTrigger.ON_SCHEDULE),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsMilitaryTime)(),
    IsEndTimeAfterStartTime({ message: 'end_time must be later than start_time' }),
    __metadata("design:type", String)
], UpdateCustomRoutineDto.prototype, "end_time", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => update_activity_dto_1.UpdateActivityDto),
    (0, class_validator_1.IsArray)(),
    (0, swagger_1.ApiProperty)({ isArray: true, type: update_activity_dto_1.UpdateActivityDto }),
    __metadata("design:type", Array)
], UpdateCustomRoutineDto.prototype, "standalone_activities", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpdateCustomRoutineDto.prototype, "activity_sequence_id", void 0);
//# sourceMappingURL=update-custom-routine.dto.dto.js.map