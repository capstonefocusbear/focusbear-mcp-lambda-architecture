"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsValidCutoffTime = IsValidCutoffTime;
const class_validator_1 = require("class-validator");
const luxon_1 = require("luxon");
function IsValidCutoffTime(validationOptions) {
    function registerIsValidCutoffTimeDecorator(object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isValidCutoffTime',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(cutoffTime, args) {
                    const { startup_time, shutdown_time } = args.object;
                    if (!cutoffTime) {
                        return true;
                    }
                    const cutoff = luxon_1.DateTime.fromFormat(cutoffTime, 'HH:mm');
                    const startup = luxon_1.DateTime.fromFormat(startup_time, 'HH:mm');
                    const shutdown = luxon_1.DateTime.fromFormat(shutdown_time, 'HH:mm');
                    if (!cutoff.isValid || !startup.isValid || !shutdown.isValid) {
                        return false;
                    }
                    if (cutoff.equals(shutdown)) {
                        const adjustedCutoff = shutdown.plus({ minutes: 1 });
                        const formattedAdjustedCutoff = adjustedCutoff.toFormat('HH:mm');
                        const target = args.object;
                        Object.assign(target, { [propertyName]: formattedAdjustedCutoff });
                        return true;
                    }
                    return (cutoff < startup && cutoff < shutdown) || cutoff > shutdown;
                },
                defaultMessage() {
                    return ((validationOptions === null || validationOptions === void 0 ? void 0 : validationOptions.message) ||
                        'cutoff_time must be either earlier than both startup_time and shutdown_time, or later than shutdown_time.');
                },
            },
        });
    }
    return registerIsValidCutoffTimeDecorator;
}
//# sourceMappingURL=is-valid-cutoff-time.decorator.js.map