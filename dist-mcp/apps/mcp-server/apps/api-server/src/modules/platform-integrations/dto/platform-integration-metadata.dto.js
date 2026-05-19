"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformIntegrationMetadataDto = void 0;
const openapi = require("@nestjs/swagger");
class PlatformIntegrationMetadataDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { client_id: { required: false, type: () => String }, access_token: { required: false, type: () => String }, refresh_token: { required: false, type: () => String }, expiry_date: { required: false, type: () => Number }, account_server: { required: false, type: () => String }, accountId: { required: false, type: () => String }, location: { required: false, type: () => String }, requires_reauth: { required: false, type: () => Boolean }, reauth_requested_at: { required: false, type: () => String } };
    }
}
exports.PlatformIntegrationMetadataDto = PlatformIntegrationMetadataDto;
//# sourceMappingURL=platform-integration-metadata.dto.js.map