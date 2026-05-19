"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.r2Config = void 0;
const config_1 = require("@nestjs/config");
exports.r2Config = (0, config_1.registerAs)('r2', () => ({
    endpoint: process.env.R2_ENDPOINT,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    signatureVersion: process.env.R2_SIGNATURE_VERSION,
    region: process.env.R2_REGION,
    publicUrl: process.env.R2_PUBLIC_URL,
}));
//# sourceMappingURL=r2.config.js.map