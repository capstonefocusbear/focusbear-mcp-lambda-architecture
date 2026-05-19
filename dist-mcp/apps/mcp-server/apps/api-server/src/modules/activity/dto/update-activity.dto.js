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
exports.UpdateActivityDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const activity_choice_data_model_1 = require("../domain/activity-choice-data.model");
const activity_data_model_1 = require("../domain/activity-data.model");
const days_of_week_enum_1 = require("../domain/days-of-week.enum");
const log_summary_type_enum_1 = require("../domain/log-summary-type.enum");
const impact_category_enum_1 = require("../domain/impact-category.enum");
function IsEqualWhenHasChoices(property, validationOptions) {
    return (object, propertyName) => {
        (0, class_validator_1.registerDecorator)({
            target: object.constructor,
            propertyName,
            constraints: [property],
            options: validationOptions,
            validator: {
                validate(_value, args) {
                    var _a;
                    const fieldValue = args.object[propertyName];
                    const choices = (_a = args.object) === null || _a === void 0 ? void 0 : _a['choices'];
                    const hasChoices = (choices === null || choices === void 0 ? void 0 : choices.length) > 0;
                    if (!hasChoices)
                        return true;
                    if (!fieldValue)
                        return true;
                    return fieldValue === property;
                },
            },
        });
    };
}
function IsSubsetOfCustomRoutineDays(validationOptions) {
    return (object, propertyName) => {
        (0, class_validator_1.registerDecorator)({
            name: 'IsSubsetOfCustomRoutineDays',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value, args) {
                    var _a;
                    const customRoutine = Object.assign({}, args.object);
                    if ((_a = customRoutine === null || customRoutine === void 0 ? void 0 : customRoutine.days_of_week) === null || _a === void 0 ? void 0 : _a.length) {
                        const parentDaysOfWeek = customRoutine.days_of_week;
                        return parentDaysOfWeek.includes(days_of_week_enum_1.DaysOfWeek.ALL)
                            ? true
                            : value.every((day) => parentDaysOfWeek.includes(day));
                    }
                    return true;
                },
                defaultMessage(args) {
                    return `${args.property} must be a subset of the parent CustomRoutine's days_of_week.`;
                },
            },
        });
    };
}
class UpdateActivityDto extends activity_data_model_1.ActivityData {
    constructor() {
        super(...arguments);
        this.days_of_week = [days_of_week_enum_1.DaysOfWeek.ALL];
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String, format: "uuid" }, log_quantity: { required: false, type: () => Boolean }, duration_seconds: { required: false, type: () => Number }, completion_requirements: { required: false, type: () => String }, log_summary_type: { required: false, enum: require("../domain/log-summary-type.enum").LogSummaryType, enum: [...Object.values(log_summary_type_enum_1.LogSummaryType), ''] }, choices: { required: false, type: () => [require("../domain/activity-choice-data.model").ActivityChoiceData], minItems: 1 }, activity_template_id: { required: false, type: () => String, format: "uuid" }, is_default: { required: false, type: () => Boolean }, run_micro_breaks: { required: false, type: () => Boolean }, days_of_week: { required: false, default: [days_of_week_enum_1.DaysOfWeek.ALL], enum: require("../domain/days-of-week.enum").DaysOfWeek, isArray: true, minItems: 1 }, log_quantity_questions: { required: false, type: () => [require("../entities/log-quantity-questions").LogQuantityQuestion] }, linked_activity_id: { required: false, type: () => String, format: "uuid" }, linked_activity_template_id: { required: false, type: () => String, format: "uuid" }, check_list: { required: false, type: () => [String] }, activity_type: { required: false, type: () => String }, impact_category: { required: false, enum: require("../domain/impact-category.enum").ImpactCategory }, tutorial: { required: false, type: () => String, format: "uuid" }, cutoff_time_for_doing_activity: { required: false, type: () => String }, geofence_id: { required: false, type: () => String, nullable: true, format: "uuid" } };
    }
}
exports.UpdateActivityDto = UpdateActivityDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsUUID)('4'),
    __metadata("design:type", String)
], UpdateActivityDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    IsEqualWhenHasChoices(false, {
        message: 'log_quantity value should be skipped or equal false for Activity with choices inside!',
    }),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], UpdateActivityDto.prototype, "log_quantity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], UpdateActivityDto.prototype, "duration_seconds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UpdateActivityDto.prototype, "completion_requirements", void 0);
__decorate([
    (0, class_validator_1.IsIn)([...Object.values(log_summary_type_enum_1.LogSummaryType), '']),
    (0, class_validator_1.IsOptional)(),
    IsEqualWhenHasChoices(log_summary_type_enum_1.LogSummaryType.SUM, {
        message: 'log_summary_type value should be skipped or equal SUM for Activity with choices inside!',
    }),
    (0, swagger_1.ApiProperty)({ enum: log_summary_type_enum_1.LogSummaryType }),
    __metadata("design:type", String)
], UpdateActivityDto.prototype, "log_summary_type", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateIf)((o) => { var _a; return ((_a = o.choices) === null || _a === void 0 ? void 0 : _a.length) > 0; }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => activity_choice_data_model_1.ActivityChoiceData),
    (0, swagger_1.ApiProperty)({ isArray: true, type: activity_choice_data_model_1.ActivityChoiceData }),
    __metadata("design:type", Array)
], UpdateActivityDto.prototype, "choices", void 0);
__decorate([
    (0, class_validator_1.IsUUID)('4'),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateActivityDto.prototype, "activity_template_id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateActivityDto.prototype, "is_default", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateActivityDto.prototype, "run_micro_breaks", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ArrayMinSize)(1),
    IsSubsetOfCustomRoutineDays({ message: 'days_of_week must be a subset of the CustomRoutine days_of_week.' }),
    __metadata("design:type", Array)
], UpdateActivityDto.prototype, "days_of_week", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], UpdateActivityDto.prototype, "log_quantity_questions", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4'),
    __metadata("design:type", String)
], UpdateActivityDto.prototype, "linked_activity_id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4'),
    __metadata("design:type", String)
], UpdateActivityDto.prototype, "linked_activity_template_id", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], UpdateActivityDto.prototype, "check_list", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateActivityDto.prototype, "activity_type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(impact_category_enum_1.ImpactCategory),
    (0, swagger_1.ApiProperty)({ enum: impact_category_enum_1.ImpactCategory }),
    __metadata("design:type", String)
], UpdateActivityDto.prototype, "impact_category", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4'),
    __metadata("design:type", String)
], UpdateActivityDto.prototype, "tutorial", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsMilitaryTime)(),
    __metadata("design:type", String)
], UpdateActivityDto.prototype, "cutoff_time_for_doing_activity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4'),
    (0, swagger_1.ApiProperty)({ required: false, nullable: true }),
    __metadata("design:type", String)
], UpdateActivityDto.prototype, "geofence_id", void 0);
//# sourceMappingURL=update-activity.dto.js.map