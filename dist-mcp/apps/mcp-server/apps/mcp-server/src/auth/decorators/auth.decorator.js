"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthContext = void 0;
const common_1 = require("@nestjs/common");
exports.AuthContext = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return { user: request.user };
});
//# sourceMappingURL=auth.decorator.js.map