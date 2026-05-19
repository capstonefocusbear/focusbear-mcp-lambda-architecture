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
exports.ActivityChoiceData = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const log_summary_type_enum_1 = require("./log-summary-type.enum");
class ActivityChoiceData {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String, format: "uuid" }, name: { required: true, type: () => String }, completion_requirements: { required: false, type: () => String }, log_quantity: { required: false, type: () => Boolean }, log_quantity_question: { required: false, type: () => String }, log_quantity_questions: { required: false, type: () => [require("../entities/log-quantity-questions").LogQuantityQuestion] }, log_summary_type: { required: false, enum: require("./log-summary-type.enum").LogSummaryType, enum: [...Object.values(log_summary_type_enum_1.LogSummaryType), ''] }, video_urls: { required: false, type: () => [String] }, allowed_apps: { required: false, type: () => [String] }, allowed_mobile_apps: { required: false, type: () => [String] }, allowed_urls: { required: false, type: () => [String] }, competency_level: { required: false, type: () => Number }, activity_template_id: { required: false, type: () => String, format: "uuid" }, linked_activity_id: { required: false, type: () => String, format: "uuid" }, linked_activity_template_id: { required: false, type: () => String, format: "uuid" }, habit_icon: { required: false, type: () => String }, geofence_id: { required: false, type: () => String, nullable: true, format: "uuid" } };
    }
}
exports.ActivityChoiceData = ActivityChoiceData;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsUUID)('4'),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ActivityChoiceData.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ActivityChoiceData.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ActivityChoiceData.prototype, "completion_requirements", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], ActivityChoiceData.prototype, "log_quantity", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ActivityChoiceData.prototype, "log_quantity_question", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Array)
], ActivityChoiceData.prototype, "log_quantity_questions", void 0);
__decorate([
    (0, class_validator_1.IsIn)([...Object.values(log_summary_type_enum_1.LogSummaryType), '']),
    (0, class_validator_1.IsOptional)(),
    (0, swagger_1.ApiProperty)({ enum: log_summary_type_enum_1.LogSummaryType }),
    __metadata("design:type", String)
], ActivityChoiceData.prototype, "log_summary_type", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => { var _a; return ((_a = o.video_urls) === null || _a === void 0 ? void 0 : _a.length) > 0; }),
    (0, class_validator_1.IsString)({ each: true }),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Array)
], ActivityChoiceData.prototype, "video_urls", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => { var _a; return ((_a = o.allowed_apps) === null || _a === void 0 ? void 0 : _a.length) > 0; }),
    (0, class_validator_1.IsString)({ each: true }),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Array)
], ActivityChoiceData.prototype, "allowed_apps", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Array)
], ActivityChoiceData.prototype, "allowed_mobile_apps", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => { var _a; return ((_a = o.allowed_urls) === null || _a === void 0 ? void 0 : _a.length) > 0; }),
    (0, class_validator_1.IsString)({ each: true }),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Array)
], ActivityChoiceData.prototype, "allowed_urls", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ActivityChoiceData.prototype, "competency_level", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4'),
    __metadata("design:type", String)
], ActivityChoiceData.prototype, "activity_template_id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4'),
    __metadata("design:type", String)
], ActivityChoiceData.prototype, "linked_activity_id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4'),
    __metadata("design:type", String)
], ActivityChoiceData.prototype, "linked_activity_template_id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ActivityChoiceData.prototype, "habit_icon", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4'),
    (0, swagger_1.ApiProperty)({ required: false, nullable: true }),
    __metadata("design:type", String)
], ActivityChoiceData.prototype, "geofence_id", void 0);
//# sourceMappingURL=activity-choice-data.model.js.map