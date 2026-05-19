"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bullConfig = void 0;
const config_1 = require("@nestjs/config");
exports.bullConfig = (0, config_1.registerAs)('bull', () => ({
    redis: {
        host: process.env.REDIS_HOSTNAME,
        port: Number(process.env.REDIS_PORT),
    },
}));
//# sourceMappingURL=bull.config.js.map