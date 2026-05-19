"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sentryConfig = void 0;
const config_1 = require("@nestjs/config");
exports.sentryConfig = (0, config_1.registerAs)('sentry', () => ({
    dsn: process.env.SENTRY_DSN,
    debug: process.env.SENTRY_DEBUG,
    environment: process.env.SENTRY_ENV,
    release: process.env.SENTRY_RELEASE,
    logLevels: process.env.SENTRY_LOG_LEVELS,
}));
//# sourceMappingURL=sentry.config.js.map