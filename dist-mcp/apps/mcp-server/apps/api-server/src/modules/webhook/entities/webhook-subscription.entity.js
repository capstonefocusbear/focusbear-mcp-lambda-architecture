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
exports.WebhookSubscription = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const webhook_event_type_enum_1 = require("../domain/webhook-event-type.enum");
let WebhookSubscription = class WebhookSubscription extends base_entity_entity_1.BaseEntity {
    constructor(subscription = {}) {
        super(subscription.id);
        Object.assign(this, subscription);
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: true, type: () => String }, name: { required: true, type: () => String }, url: { required: true, type: () => String }, event_types: { required: true, enum: require("../domain/webhook-event-type.enum").WebhookEventType, isArray: true }, secret: { required: false, type: () => String }, is_active: { required: true, type: () => Boolean }, last_triggered_at: { required: false, type: () => Date }, failure_count: { required: true, type: () => Number }, user: { required: false, type: () => require("../../user/entities/user.entity").User } };
    }
};
exports.WebhookSubscription = WebhookSubscription;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], WebhookSubscription.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 255,
        nullable: false,
    }),
    __metadata("design:type", String)
], WebhookSubscription.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 2048,
        nullable: false,
    }),
    __metadata("design:type", String)
], WebhookSubscription.prototype, "url", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: webhook_event_type_enum_1.WebhookEventType,
        array: true,
        nullable: false,
    }),
    __metadata("design:type", Array)
], WebhookSubscription.prototype, "event_types", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 64,
        nullable: true,
        transformer: base_entity_entity_1.BaseEntity.encryptField('secret'),
    }),
    __metadata("design:type", String)
], WebhookSubscription.prototype, "secret", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: true,
    }),
    __metadata("design:type", Boolean)
], WebhookSubscription.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
        nullable: true,
    }),
    __metadata("design:type", Date)
], WebhookSubscription.prototype, "last_triggered_at", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'integer',
        default: 0,
    }),
    __metadata("design:type", Number)
], WebhookSubscription.prototype, "failure_count", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], WebhookSubscription.prototype, "user", void 0);
exports.WebhookSubscription = WebhookSubscription = __decorate([
    (0, typeorm_1.Entity)('webhook_subscriptions'),
    __metadata("design:paramtypes", [Object])
], WebhookSubscription);
//# sourceMappingURL=webhook-subscription.entity.js.map