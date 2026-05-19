"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth0Config = void 0;
const config_1 = require("@nestjs/config");
exports.auth0Config = (0, config_1.registerAs)('auth0', () => ({
    clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID,
    clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET,
    domain: process.env.AUTH0_DOMAIN,
    connection: process.env.AUTH0_CONNECTION || 'Username-Password-Authentication',
    identifier: process.env.AUTH0_IDENTIFIER,
    actionSecret: process.env.AUTH0_ACTION_SECRET,
}));
//# sourceMappingURL=auth0.config.js.map