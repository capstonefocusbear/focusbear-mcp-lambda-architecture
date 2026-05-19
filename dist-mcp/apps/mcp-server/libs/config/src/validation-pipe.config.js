"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationPipeConfig = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
exports.validationPipeConfig = (0, config_1.registerAs)('validation-pipe', () => ({
    transform: true,
    transformOptions: {
        enableImplicitConversion: true,
    },
    forbidUnknownValues: false,
    exceptionFactory(errors) {
        return new common_1.BadRequestException(errors);
    },
}));
//# sourceMappingURL=validation-pipe.config.js.map