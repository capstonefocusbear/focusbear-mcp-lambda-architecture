"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokensConfig = void 0;
const config_1 = require("@nestjs/config");
exports.tokensConfig = (0, config_1.registerAs)('tokens', () => ({
    invitation: {
        secret: process.env.JWT_INVITATION_SECRET,
        signOptions: {
            expiresIn: '7 days',
        },
    },
    email_verification: {
        secret: process.env.EMAIL_VERIFICATION_SECRET,
        signOptions: {
            expiresIn: '7 days',
        },
    },
    password_reset: {
        secret: process.env.PASSWORD_RESET_SECRET,
        signOptions: {
            expiresIn: '1 hour',
        },
    },
    accountability_buddy_invitation: {
        secret: process.env.ACCOUNTABILITY_BUDDY_INVITATION_SECRET,
        signOptions: {
            expiresIn: '7 days',
        },
    },
    unlock_request_approval: {
        secret: process.env.UNLOCK_REQUEST_APPROVAL_SECRET,
        signOptions: {
            expiresIn: '24 hours',
        },
    },
}));
//# sourceMappingURL=jwt.config.js.map