"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeConfig = void 0;
const config_1 = require("@nestjs/config");
exports.stripeConfig = (0, config_1.registerAs)('stripeConfig', () => ({
    secretKey: process.env.STRIPE_SECRET_KEY,
    checkout: {
        success_url: process.env.STRIPE_CHECKOUT_SUCCESS_URL,
        cancel_url: process.env.STRIPE_CHECKOUT_CANCEL_URL,
    },
    webhook: {
        secret: process.env.STRIPE_WEBHOOK_SECRET,
    },
}));
//# sourceMappingURL=stripe.config.js.map