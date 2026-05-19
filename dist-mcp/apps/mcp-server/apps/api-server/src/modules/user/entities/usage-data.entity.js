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
exports.UsageData = exports.UsageType = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
var UsageType;
(function (UsageType) {
    UsageType["APP"] = "app";
    UsageType["WEBSITE"] = "website";
})(UsageType || (exports.UsageType = UsageType = {}));
let UsageData = class UsageData {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, userId: { required: true, type: () => String }, sourceName: { required: true, type: () => String }, usageType: { required: true, enum: require("./usage-data.entity").UsageType }, usageCategory: { required: true, type: () => String }, platform: { required: true, type: () => String }, deviceId: { required: true, type: () => String }, usageStartDate: { required: true, type: () => Date }, usageEndDate: { required: true, type: () => Date }, minutesUsedTotal: { required: true, type: () => Number }, minutesUsedDuringSleepWindow: { required: true, type: () => Number }, createdAt: { required: true, type: () => Date }, updatedAt: { required: true, type: () => Date } };
    }
};
exports.UsageData = UsageData;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], UsageData.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id' }),
    __metadata("design:type", String)
], UsageData.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'source_name' }),
    __metadata("design:type", String)
], UsageData.prototype, "sourceName", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'usage_type',
        type: 'enum',
        enum: UsageType,
    }),
    __metadata("design:type", String)
], UsageData.prototype, "usageType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'usage_category' }),
    __metadata("design:type", String)
], UsageData.prototype, "usageCategory", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'platform' }),
    __metadata("design:type", String)
], UsageData.prototype, "platform", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'device_id' }),
    __metadata("design:type", String)
], UsageData.prototype, "deviceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'usage_start_date', type: 'date' }),
    __metadata("design:type", Date)
], UsageData.prototype, "usageStartDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'usage_end_date', type: 'date' }),
    __metadata("design:type", Date)
], UsageData.prototype, "usageEndDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'minutes_used_total', type: 'integer' }),
    __metadata("design:type", Number)
], UsageData.prototype, "minutesUsedTotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'minutes_used_during_sleep_window', type: 'integer' }),
    __metadata("design:type", Number)
], UsageData.prototype, "minutesUsedDuringSleepWindow", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], UsageData.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], UsageData.prototype, "updatedAt", void 0);
exports.UsageData = UsageData = __decorate([
    (0, typeorm_1.Entity)('usage_data'),
    (0, typeorm_1.Index)('idx_usage_data_unique', ['userId', 'sourceName', 'usageType', 'usageStartDate', 'usageEndDate'], {
        unique: true,
    })
], UsageData);
//# sourceMappingURL=usage-data.entity.js.map