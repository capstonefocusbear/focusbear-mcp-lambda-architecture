"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InjectSentry = InjectSentry;
const common_1 = require("@nestjs/common");
const sentry_constants_1 = require("./sentry.constants");
function InjectSentry() {
    return (0, common_1.Inject)(sentry_constants_1.SENTRY_TOKEN);
}
//# sourceMappingURL=sentry.decorators.js.map