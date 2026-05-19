"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zohoConfig = void 0;
const config_1 = require("@nestjs/config");
exports.zohoConfig = (0, config_1.registerAs)('zoho', () => ({
    ZOHO_CLIENT_ID: process.env.ZOHO_CLIENT_ID,
    ZOHO_CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET,
    ZOHO_ORG_ID: process.env.ZOHO_ORG_ID,
    ZOHO_CALLBACK_URL: process.env.ZOHO_CALLBACK_URL,
    ZOHO_CALLBACK_URL_DEVELOPMENT: process.env.ZOHO_CALLBACK_URL_DEVELOPMENT,
    ZOHO_WHATSAPP_CHANNEL_ID: process.env.ZOHO_WHATSAPP_CHANNEL_ID,
    ZOHO_REFRESH_TOKEN: process.env.ZOHO_REFRESH_TOKEN,
    ZOHO_DESK_CLIENT_ID: process.env.ZOHO_DESK_CLIENT_ID,
    ZOHO_DESK_CLIENT_SECRET: process.env.ZOHO_DESK_CLIENT_SECRET,
    ZOHO_DESK_BASE_URL: process.env.ZOHO_DESK_BASE_URL,
    ZOHO_ACCOUNTS_BASE_URL: process.env.ZOHO_ACCOUNTS_BASE_URL,
}));
//# sourceMappingURL=zoho.config.js.map