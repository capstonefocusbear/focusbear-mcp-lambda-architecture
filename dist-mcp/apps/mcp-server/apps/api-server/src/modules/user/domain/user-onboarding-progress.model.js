"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserOnboardingProgress = void 0;
const openapi = require("@nestjs/swagger");
class UserOnboardingProgress {
    static _OPENAPI_METADATA_FACTORY() {
        return { level: { required: false, type: () => Number }, has_edited_focus_mode: { required: false, type: () => Boolean }, has_edited_settings: { required: false, type: () => Boolean }, has_edited_always_blocked_urls: { required: false, type: () => Boolean }, has_installed_desktop_app: { required: false, type: () => Boolean }, has_installed_mobile_app: { required: false, type: () => Boolean }, has_chatted_with_focus_bear: { required: false, type: () => Boolean } };
    }
}
exports.UserOnboardingProgress = UserOnboardingProgress;
//# sourceMappingURL=user-onboarding-progress.model.js.map