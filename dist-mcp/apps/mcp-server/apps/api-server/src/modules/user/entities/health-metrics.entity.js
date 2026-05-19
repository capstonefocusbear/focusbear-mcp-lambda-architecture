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
exports.HealthMetrics = exports.HealthMetricType = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
var HealthMetricType;
(function (HealthMetricType) {
    HealthMetricType["HOURS_OF_SLEEP"] = "hours_of_sleep";
    HealthMetricType["MINUTES_OF_MOVEMENT"] = "minutes_of_movement";
    HealthMetricType["NUMBER_OF_STEPS_MOVED"] = "number_of_steps_moved";
})(HealthMetricType || (exports.HealthMetricType = HealthMetricType = {}));
let HealthMetrics = class HealthMetrics {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, userId: { required: true, type: () => String }, metricType: { required: true, enum: require("./health-metrics.entity").HealthMetricType }, dayOfTracking: { required: true, type: () => Date }, metricValue: { required: true, type: () => Number }, createdAt: { required: true, type: () => Date }, updatedAt: { required: true, type: () => Date } };
    }
};
exports.HealthMetrics = HealthMetrics;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], HealthMetrics.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id' }),
    __metadata("design:type", String)
], HealthMetrics.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'metric_type',
        type: 'enum',
        enum: HealthMetricType,
    }),
    __metadata("design:type", String)
], HealthMetrics.prototype, "metricType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'day_of_tracking', type: 'date' }),
    __metadata("design:type", Date)
], HealthMetrics.prototype, "dayOfTracking", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'metric_value', type: 'float' }),
    __metadata("design:type", Number)
], HealthMetrics.prototype, "metricValue", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], HealthMetrics.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], HealthMetrics.prototype, "updatedAt", void 0);
exports.HealthMetrics = HealthMetrics = __decorate([
    (0, typeorm_1.Entity)('health_metrics')
], HealthMetrics);
//# sourceMappingURL=health-metrics.entity.js.map