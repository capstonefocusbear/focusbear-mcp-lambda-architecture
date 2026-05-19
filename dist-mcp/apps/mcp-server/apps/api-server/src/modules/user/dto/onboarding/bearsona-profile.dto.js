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
exports.BearsonaProfileDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const bearsona_profile_enum_1 = require("../../domain/onboarding/bearsona-profile.enum");
class BearsonaProfileDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, enum: require("../../domain/onboarding/bearsona-profile.enum").BearsonaProfile }, useProfileLang: { required: true, type: () => Boolean } };
    }
}
exports.BearsonaProfileDto = BearsonaProfileDto;
__decorate([
    (0, class_validator_1.IsEnum)(bearsona_profile_enum_1.BearsonaProfile),
    __metadata("design:type", String)
], BearsonaProfileDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], BearsonaProfileDto.prototype, "useProfileLang", void 0);
//# sourceMappingURL=bearsona-profile.dto.js.map