"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionStatus = void 0;
const openapi = require("@nestjs/swagger");
class SubscriptionStatus {
    constructor({ activeEntitlements, expirations } = {}) {
        this.hasActiveSubscription = (activeEntitlements === null || activeEntitlements === void 0 ? void 0 : activeEntitlements.length) > 0;
        this.activeEntitlements = activeEntitlements || [];
        this.expirations = expirations;
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { hasActiveSubscription: { required: true, type: () => Boolean }, activeEntitlements: { required: true, type: () => Object }, expirations: { required: false, type: () => Object } };
    }
}
exports.SubscriptionStatus = SubscriptionStatus;
//# sourceMappingURL=subscription-status.model.js.map