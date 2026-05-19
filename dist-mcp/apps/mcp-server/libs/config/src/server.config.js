"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverConfig = void 0;
const config_1 = require("@nestjs/config");
exports.serverConfig = (0, config_1.registerAs)('server', () => ({
    port: process.env.SERVER_PORT || 5038,
    host: process.env.SERVER_HOST || '0.0.0.0',
    frontEndUrl: process.env.frontEndUrl,
    devFrontendUrl: process.env.devFrontendUrl,
}));
//# sourceMappingURL=server.config.js.map