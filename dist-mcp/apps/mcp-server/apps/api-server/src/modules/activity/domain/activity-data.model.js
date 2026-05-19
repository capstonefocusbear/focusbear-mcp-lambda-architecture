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
exports.ActivityData = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const activity_choice_type_enum_1 = require("./activity-choice-type.enum");
const activity_priority_enum_1 = require("./activity-priority.enum");
const ActivityImageData_model_1 = require("./ActivityImageData.model");
const take_notes_options_enum_1 = require("./take-notes-options.enum");
const break_type_enum_1 = require("./break-type.enum");
class ActivityData {
    constructor(data = {}) {
        var _a;
        this.name = data.name;
        this.is_office_friendly = data === null || data === void 0 ? void 0 : data.is_office_friendly;
        this.allowed_focus_mode_id = data === null || data === void 0 ? void 0 : data.allowed_focus_mode_id;
        this.video_urls = data === null || data === void 0 ? void 0 : data.video_urls;
        this.allowed_apps = data === null || data === void 0 ? void 0 : data.allowed_apps;
        this.allowed_mobile_apps = data === null || data === void 0 ? void 0 : data.allowed_mobile_apps;
        this.include_in_every_break = data === null || data === void 0 ? void 0 : data.include_in_every_break;
        this.log_quantity_question = data === null || data === void 0 ? void 0 : data.log_quantity_question;
        this.choice_type = data === null || data === void 0 ? void 0 : data.choice_type;
        this.allowed_urls = data === null || data === void 0 ? void 0 : data.allowed_urls;
        this.take_notes = data === null || data === void 0 ? void 0 : data.take_notes;
        this.category = data === null || data === void 0 ? void 0 : data.category;
        this.text_instructions = data === null || data === void 0 ? void 0 : data.text_instructions;
        this.image_urls = data === null || data === void 0 ? void 0 : data.image_urls;
        this.priority = (_a = data === null || data === void 0 ? void 0 : data.priority) !== null && _a !== void 0 ? _a : activity_priority_enum_1.ActivityPriority.STANDARD;
        this.current_competency_level = data === null || data === void 0 ? void 0 : data.current_competency_level;
        this.competency_level = data === null || data === void 0 ? void 0 : data.competency_level;
        this.break_type = data === null || data === void 0 ? void 0 : data.break_type;
        this.show_saved_distracting_websites = data === null || data === void 0 ? void 0 : data.show_saved_distracting_websites;
        this.habit_icon = data === null || data === void 0 ? void 0 : data.habit_icon;
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String }, is_office_friendly: { required: false, type: () => Boolean }, take_notes: { required: false, enum: require("./take-notes-options.enum").TakeNotesOptions }, priority: { required: false, enum: require("./activity-priority.enum").ActivityPriority }, allowed_focus_mode_id: { required: false, type: () => String, format: "uuid" }, video_urls: { required: false, type: () => [String] }, include_in_every_break: { required: false, type: () => Boolean }, habit_icon: { required: false, type: () => String }, log_quantity_question: { required: false, type: () => String }, choice_type: { required: false, enum: require("./activity-choice-type.enum").ActivityChoiceType, enum: Object.values(activity_choice_type_enum_1.ActivityChoiceType) }, allowed_apps: { required: false, type: () => [String] }, allowed_mobile_apps: { required: false, type: () => [String] }, allowed_urls: { required: false, type: () => [String] }, category: { required: false, type: () => String }, text_instructions: { required: false, type: () => String }, image_urls: { required: false, type: () => [require("./ActivityImageData.model").ActivityImageData] }, current_competency_level: { required: false, type: () => Number }, competency_level: { required: false, type: () => Number }, break_type: { required: false, enum: require("./break-type.enum").BreakType, enum: Object.values(break_type_enum_1.BreakType) }, show_saved_distracting_websites: { required: false, type: () => Boolean } };
    }
}
exports.ActivityData = ActivityData;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ActivityData.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], ActivityData.prototype, "is_office_friendly", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(take_notes_options_enum_1.TakeNotesOptions),
    (0, class_validator_1.IsOptional)(),
    (0, swagger_1.ApiProperty)({ enum: take_notes_options_enum_1.TakeNotesOptions }),
    __metadata("design:type", String)
], ActivityData.prototype, "take_notes", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(activity_priority_enum_1.ActivityPriority),
    (0, class_validator_1.IsOptional)(),
    (0, swagger_1.ApiProperty)({ enum: activity_priority_enum_1.ActivityPriority }),
    __metadata("design:type", String)
], ActivityData.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsUUID)('4'),
    (0, class_validator_1.IsOptional)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ActivityData.prototype, "allowed_focus_mode_id", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => { var _a; return ((_a = o.video_urls) === null || _a === void 0 ? void 0 : _a.length) > 0; }),
    (0, class_validator_1.IsString)({ each: true }),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Array)
], ActivityData.prototype, "video_urls", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], ActivityData.prototype, "include_in_every_break", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ActivityData.prototype, "habit_icon", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ActivityData.prototype, "log_quantity_question", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(activity_choice_type_enum_1.ActivityChoiceType),
    (0, class_validator_1.IsIn)(Object.values(activity_choice_type_enum_1.ActivityChoiceType)),
    (0, class_validator_1.IsOptional)(),
    (0, swagger_1.ApiProperty)({ enum: activity_choice_type_enum_1.ActivityChoiceType }),
    __metadata("design:type", String)
], ActivityData.prototype, "choice_type", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => { var _a; return ((_a = o.allowed_apps) === null || _a === void 0 ? void 0 : _a.length) > 0; }),
    (0, class_validator_1.IsString)({ each: true }),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Array)
], ActivityData.prototype, "allowed_apps", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Array)
], ActivityData.prototype, "allowed_mobile_apps", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => { var _a; return ((_a = o.allowed_urls) === null || _a === void 0 ? void 0 : _a.length) > 0; }),
    (0, class_validator_1.IsString)({ each: true }),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Array)
], ActivityData.prototype, "allowed_urls", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ActivityData.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ActivityData.prototype, "text_instructions", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_transformer_1.Type)(() => ActivityImageData_model_1.ActivityImageData),
    __metadata("design:type", Array)
], ActivityData.prototype, "image_urls", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ActivityData.prototype, "current_competency_level", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ActivityData.prototype, "competency_level", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(break_type_enum_1.BreakType),
    (0, class_validator_1.IsIn)(Object.values(break_type_enum_1.BreakType)),
    (0, class_validator_1.IsOptional)(),
    (0, swagger_1.ApiProperty)({ enum: break_type_enum_1.BreakType }),
    __metadata("design:type", String)
], ActivityData.prototype, "break_type", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], ActivityData.prototype, "show_saved_distracting_websites", void 0);
//# sourceMappingURL=activity-data.model.js.map