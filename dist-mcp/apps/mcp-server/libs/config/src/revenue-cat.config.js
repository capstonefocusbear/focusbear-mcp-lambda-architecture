"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revenueCatConfig = void 0;
const config_1 = require("@nestjs/config");
exports.revenueCatConfig = (0, config_1.registerAs)('revenueCat', () => ({
    secretApiKey: process.env.REVENUE_CAT_SECRET_KEY,
    publicApiKey: process.env.REVENUE_CAT_PUBLIC_KEY,
}));
//# sourceMappingURL=revenue-cat.config.js.map