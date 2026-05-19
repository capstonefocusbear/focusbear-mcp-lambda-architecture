"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserMetadata = void 0;
const openapi = require("@nestjs/swagger");
class UserMetadata {
    static _OPENAPI_METADATA_FACTORY() {
        return { profile_image: { required: false, type: () => String }, description: { required: false, type: () => String }, name: { required: false, type: () => String }, last_email_sent: { required: false, type: () => String }, email_preferences: { required: false, type: () => Object } };
    }
}
exports.UserMetadata = UserMetadata;
//# sourceMappingURL=user-metadata.model.js.map