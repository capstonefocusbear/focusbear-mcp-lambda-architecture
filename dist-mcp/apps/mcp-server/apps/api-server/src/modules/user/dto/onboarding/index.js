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
exports.OnboardingDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const onboarding_flow_step_enum_1 = require("../../domain/onboarding/onboarding-flow-step.enum");
const onboarding_flow_feature_enum_1 = require("../../domain/onboarding/onboarding-flow-feature.enum");
const routine_type_enum_1 = require("../../domain/routine-type.enum");
const bearsona_profile_dto_1 = require("./bearsona-profile.dto");
const activities_dto_1 = require("./activities.dto");
class OnboardingDto {
}
exports.OnboardingDto = OnboardingDto;
__decorate([
    (0, class_validator_1.IsEnum)(onboarding_flow_step_enum_1.OnboardFlowStep),
    __metadata("design:type", String)
], OnboardingDto.prototype, "currentStep", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(onboarding_flow_feature_enum_1.OnboardFlowFeature, { each: true }),
    __metadata("design:type", Array)
], OnboardingDto.prototype, "features", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(routine_type_enum_1.RoutineType, { each: true }),
    __metadata("design:type", Array)
], OnboardingDto.prototype, "routines", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => bearsona_profile_dto_1.BearsonaProfileDto),
    __metadata("design:type", Object)
], OnboardingDto.prototype, "profile", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => activities_dto_1.ActivitiesDto),
    __metadata("design:type", Object)
], OnboardingDto.prototype, "activities", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], OnboardingDto.prototype, "selectedGoals", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], OnboardingDto.prototype, "times", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OnboardingDto.prototype, "currentTimeUI", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(999),
    __metadata("design:type", Number)
], OnboardingDto.prototype, "break_after_minutes", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(onboarding_flow_step_enum_1.OnboardFlowStep, { each: true }),
    __metadata("design:type", Array)
], OnboardingDto.prototype, "skippedSteps", void 0);
//# sourceMappingURL=index.js.map