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
exports.UpdateLocalDeviceSettingsDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const web_device_settings_dto_1 = require("./web-device-settings.dto");
class UpdateLocalDeviceSettingsDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { MacOS: { required: false, type: () => Object }, Windows: { required: false, type: () => Object }, Android: { required: false, type: () => Object }, iOS: { required: false, type: () => Object }, Web: { required: false, type: () => require("./web-device-settings.dto").WebDeviceSettingsDto } };
    }
}
exports.UpdateLocalDeviceSettingsDto = UpdateLocalDeviceSettingsDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateLocalDeviceSettingsDto.prototype, "MacOS", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateLocalDeviceSettingsDto.prototype, "Windows", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateLocalDeviceSettingsDto.prototype, "Android", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateLocalDeviceSettingsDto.prototype, "iOS", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", web_device_settings_dto_1.WebDeviceSettingsDto)
], UpdateLocalDeviceSettingsDto.prototype, "Web", void 0);
//# sourceMappingURL=update-local-device-settings.dto.js.map