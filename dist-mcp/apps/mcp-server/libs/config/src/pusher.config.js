"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pusherCongif = void 0;
const config_1 = require("@nestjs/config");
exports.pusherCongif = (0, config_1.registerAs)('pusher', () => ({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_APP_KEY,
    secret: process.env.PUSHER_APP_SECRET,
    cluster: process.env.PUSHER_APP_CLUSTER,
    useTLS: true,
}));
//# sourceMappingURL=pusher.config.js.map