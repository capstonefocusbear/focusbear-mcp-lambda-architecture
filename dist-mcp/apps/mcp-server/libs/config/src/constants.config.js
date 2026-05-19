"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.constants = void 0;
const config_1 = require("@nestjs/config");
exports.constants = (0, config_1.registerAs)('constants', () => ({
    validation: {
        patterns: {
            'HH:MM': /^([01][0-9]|2[0-3]):([0-5][0-9])$/,
        },
    },
    subscriptions: {
        trialDurationDays: '7',
    },
    userSettings: {
        generateDefault: () => ({
            shutdown_time: '20:30',
            startup_time: '05:15',
            morning_activities: [],
            break_after_minutes: 15,
            break_activities: [],
            evening_activities: [],
            custom_routines: [],
        }),
    },
}));
//# sourceMappingURL=constants.config.js.map