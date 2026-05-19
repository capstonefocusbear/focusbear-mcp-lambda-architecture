"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pusherBeamsConfig = void 0;
const config_1 = require("@nestjs/config");
exports.pusherBeamsConfig = (0, config_1.registerAs)('pusher-beams', () => ({
    instanceId: process.env.PUSHER_BEAMS_INSTANCE_ID,
    secretKey: process.env.PUSHER_BEAMS_PRIMARY_KEY,
}));
//# sourceMappingURL=pusher-beams.config.js.map