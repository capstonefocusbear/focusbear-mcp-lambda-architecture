"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.helmetConfig = void 0;
const config_1 = require("@nestjs/config");
exports.helmetConfig = (0, config_1.registerAs)('helmet', () => ({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
            scriptSrc: ["'self'", "https: 'unsafe-inline'"],
        },
    },
}));
//# sourceMappingURL=helmet.config.js.map