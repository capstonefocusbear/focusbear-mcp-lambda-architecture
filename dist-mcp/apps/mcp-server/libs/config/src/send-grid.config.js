"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendGridConfig = void 0;
const config_1 = require("@nestjs/config");
exports.sendGridConfig = (0, config_1.registerAs)('sendGrid', () => ({
    apiKey: process.env.SENDGRID_KEY,
}));
//# sourceMappingURL=send-grid.config.js.map