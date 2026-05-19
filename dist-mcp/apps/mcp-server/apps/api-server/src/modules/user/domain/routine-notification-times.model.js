"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutineNotificationTimes = void 0;
const openapi = require("@nestjs/swagger");
class RoutineNotificationTimes {
    static _OPENAPI_METADATA_FACTORY() {
        return { last_time_notified_of_morning_routine: { required: true, type: () => Date }, last_time_notified_of_evening_routine: { required: true, type: () => Date } };
    }
}
exports.RoutineNotificationTimes = RoutineNotificationTimes;
//# sourceMappingURL=routine-notification-times.model.js.map