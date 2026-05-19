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
exports.CompletedActivityMetadata = void 0;
exports.normalizeBooleanLike = normalizeBooleanLike;
exports.isTruthyBooleanLike = isTruthyBooleanLike;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
function normalizeBooleanLike(value) {
    if (value === null || value === undefined || value === '') {
        return undefined;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number') {
        if (value === 1)
            return true;
        if (value === 0)
            return false;
        return value;
    }
    if (typeof value === 'string') {
        const normalizedValue = value.trim().toLowerCase();
        if (normalizedValue === 'true' || normalizedValue === '1')
            return true;
        if (normalizedValue === 'false' || normalizedValue === '0')
            return false;
    }
    return value;
}
function isTruthyBooleanLike(value) {
    return normalizeBooleanLike(value) === true;
}
function toBooleanIfBooleanLike({ value }) {
    return normalizeBooleanLike(value);
}
class CompletedActivityMetadata {
}
exports.CompletedActivityMetadata = CompletedActivityMetadata;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(toBooleanIfBooleanLike, { toClassOnly: true }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CompletedActivityMetadata.prototype, "is_skipped", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(toBooleanIfBooleanLike, { toClassOnly: true }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CompletedActivityMetadata.prototype, "skipped_did_not_complete", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(toBooleanIfBooleanLike, { toClassOnly: true }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CompletedActivityMetadata.prototype, "skipped_did_complete", void 0);
//# sourceMappingURL=completed-activity.metadata.js.map