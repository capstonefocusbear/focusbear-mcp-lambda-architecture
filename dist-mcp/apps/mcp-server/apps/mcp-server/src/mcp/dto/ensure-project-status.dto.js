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
exports.EnsureProjectStatusResponseDto = exports.EnsureProjectStatusDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class EnsureProjectStatusDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { project_id: { required: true, type: () => String, format: "uuid" }, label: { required: true, type: () => String, maxLength: 100 }, color: { required: true, type: () => String, pattern: "/^#[0-9A-Fa-f]{6}$/" }, should_complete_task: { required: false, type: () => Boolean } };
    }
}
exports.EnsureProjectStatusDto = EnsureProjectStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'UUID of the project to add the status to',
        example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], EnsureProjectStatusDto.prototype, "project_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Display label for the status (case-insensitive deduplication)',
        example: 'Ready for human review',
        maxLength: 100,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], EnsureProjectStatusDto.prototype, "label", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Hex color code for the status badge',
        example: '#F59E0B',
        pattern: '^#[0-9A-Fa-f]{6}$',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a valid hex color code (e.g. #F59E0B)' }),
    __metadata("design:type", String)
], EnsureProjectStatusDto.prototype, "color", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Whether tasks assigned this status should be marked as completed',
        required: false,
        default: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], EnsureProjectStatusDto.prototype, "should_complete_task", void 0);
class EnsureProjectStatusResponseDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, label: { required: true, type: () => String }, color: { required: true, type: () => String }, order: { required: true, type: () => Number }, should_complete_task: { required: true, type: () => Boolean }, already_existed: { required: true, type: () => Boolean } };
    }
}
exports.EnsureProjectStatusResponseDto = EnsureProjectStatusResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Status ID (UUID for new statuses; original id for existing ones)' }),
    __metadata("design:type", String)
], EnsureProjectStatusResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Display label' }),
    __metadata("design:type", String)
], EnsureProjectStatusResponseDto.prototype, "label", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Hex color code' }),
    __metadata("design:type", String)
], EnsureProjectStatusResponseDto.prototype, "color", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Sort order within the project' }),
    __metadata("design:type", Number)
], EnsureProjectStatusResponseDto.prototype, "order", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether tasks assigned this status are considered completed' }),
    __metadata("design:type", Boolean)
], EnsureProjectStatusResponseDto.prototype, "should_complete_task", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether this status already existed (true) or was just created (false)' }),
    __metadata("design:type", Boolean)
], EnsureProjectStatusResponseDto.prototype, "already_existed", void 0);
//# sourceMappingURL=ensure-project-status.dto.js.map