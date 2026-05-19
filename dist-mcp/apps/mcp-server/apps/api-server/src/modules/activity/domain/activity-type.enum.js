"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityType = void 0;
exports.normalizeRoutineTypeToActivityType = normalizeRoutineTypeToActivityType;
var ActivityType;
(function (ActivityType) {
    ActivityType["break"] = "breaking";
    ActivityType["morning"] = "morning";
    ActivityType["evening"] = "evening";
    ActivityType["standalone"] = "standalone";
    ActivityType["library"] = "library";
})(ActivityType || (exports.ActivityType = ActivityType = {}));
function normalizeRoutineTypeToActivityType(routineType) {
    if (!routineType)
        return undefined;
    const normalized = String(routineType).trim().toLowerCase();
    switch (normalized) {
        case 'morning':
            return ActivityType.morning;
        case 'evening':
            return ActivityType.evening;
        case 'break':
        case 'breaking':
            return ActivityType.break;
        case 'library':
            return ActivityType.library;
        case 'standalone':
            return ActivityType.standalone;
        default:
            return undefined;
    }
}
//# sourceMappingURL=activity-type.enum.js.map