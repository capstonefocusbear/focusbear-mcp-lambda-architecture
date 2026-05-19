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
exports.UpdateUserSettingsDto = exports.NotIdenticalTimesConstraint = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const update_activity_dto_1 = require("../../activity/dto/update-activity.dto");
const language_options_enum_1 = require("../../../shared/domain/language-options.enum");
const update_custom_routine_dto_dto_1 = require("./update-custom-routine.dto.dto");
const is_valid_cutoff_time_decorator_1 = require("../../../shared/decorators/is-valid-cutoff-time.decorator");
let NotIdenticalTimesConstraint = class NotIdenticalTimesConstraint {
    validate(shutdownTime, args) {
        const object = args.object;
        return shutdownTime !== object.startup_time;
    }
    defaultMessage(args) {
        return 'Shutdown time cannot be the same as startup time';
    }
    static _OPENAPI_METADATA_FACTORY() {
        return {};
    }
};
exports.NotIdenticalTimesConstraint = NotIdenticalTimesConstraint;
exports.NotIdenticalTimesConstraint = NotIdenticalTimesConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'NotIdenticalTimes', async: false })
], NotIdenticalTimesConstraint);
class UpdateUserSettingsDto {
    constructor() {
        this.language = language_options_enum_1.LanguageOptions.ENGLISH;
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { startup_time: { required: false, type: () => String }, shutdown_time: { required: false, type: () => String }, sleep_time: { required: false, type: () => String }, cutoff_time_for_non_high_priority_activities: { required: false, type: () => String }, break_after_minutes: { required: false, type: () => Number, minimum: 1 }, morning_activities: { required: false, type: () => [require("../../activity/dto/update-activity.dto").UpdateActivityDto] }, evening_activities: { required: false, type: () => [require("../../activity/dto/update-activity.dto").UpdateActivityDto] }, break_activities: { required: false, type: () => [require("../../activity/dto/update-activity.dto").UpdateActivityDto] }, language: { required: false, default: language_options_enum_1.LanguageOptions.ENGLISH, enum: require("../../../shared/domain/language-options.enum").LanguageOptions, enum: ['en', 'es'] }, custom_routines: { required: false, type: () => [require("./update-custom-routine.dto.dto").UpdateCustomRoutineDto] }, verbose_logging: { required: false, type: () => Boolean } };
    }
}
exports.UpdateUserSettingsDto = UpdateUserSettingsDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsMilitaryTime)(),
    __metadata("design:type", String)
], UpdateUserSettingsDto.prototype, "startup_time", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsMilitaryTime)(),
    (0, class_validator_1.Validate)(NotIdenticalTimesConstraint),
    __metadata("design:type", String)
], UpdateUserSettingsDto.prototype, "shutdown_time", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsMilitaryTime)(),
    __metadata("design:type", String)
], UpdateUserSettingsDto.prototype, "sleep_time", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsMilitaryTime)(),
    (0, is_valid_cutoff_time_decorator_1.IsValidCutoffTime)({
        message: 'Invalid cutoff time. Must satisfy the condition (cutoff < startup && cutoff < shutdown) || cutoff > shutdown.',
    }),
    __metadata("design:type", String)
], UpdateUserSettingsDto.prototype, "cutoff_time_for_non_high_priority_activities", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateUserSettingsDto.prototype, "break_after_minutes", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => update_activity_dto_1.UpdateActivityDto),
    (0, swagger_1.ApiProperty)({ isArray: true, type: update_activity_dto_1.UpdateActivityDto }),
    __metadata("design:type", Array)
], UpdateUserSettingsDto.prototype, "morning_activities", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => update_activity_dto_1.UpdateActivityDto),
    (0, swagger_1.ApiProperty)({ isArray: true, type: update_activity_dto_1.UpdateActivityDto }),
    __metadata("design:type", Array)
], UpdateUserSettingsDto.prototype, "evening_activities", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => update_activity_dto_1.UpdateActivityDto),
    (0, swagger_1.ApiProperty)({ isArray: true, type: update_activity_dto_1.UpdateActivityDto }),
    __metadata("design:type", Array)
], UpdateUserSettingsDto.prototype, "break_activities", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['en', 'es'], { message: 'Supported languages are "en" and "es" only.' }),
    __metadata("design:type", String)
], UpdateUserSettingsDto.prototype, "language", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => update_custom_routine_dto_dto_1.UpdateCustomRoutineDto),
    (0, swagger_1.ApiProperty)({ isArray: true, type: update_custom_routine_dto_dto_1.UpdateCustomRoutineDto }),
    __metadata("design:type", Array)
], UpdateUserSettingsDto.prototype, "custom_routines", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, swagger_1.ApiProperty)({ required: false, type: Boolean }),
    __metadata("design:type", Boolean)
], UpdateUserSettingsDto.prototype, "verbose_logging", void 0);
//# sourceMappingURL=update-user-settings.dto.js.map