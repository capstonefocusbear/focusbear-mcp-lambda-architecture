"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalTaskStatus = void 0;
const openapi = require("@nestjs/swagger");
class ExternalTaskStatus {
    constructor({ label, status_id, should_complete_task }) {
        this.label = label;
        this.status_id = status_id;
        this.should_complete_task = should_complete_task;
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { label: { required: true, type: () => String }, status_id: { required: true, type: () => String }, should_complete_task: { required: true, type: () => Boolean } };
    }
}
exports.ExternalTaskStatus = ExternalTaskStatus;
//# sourceMappingURL=external-task-status.model.js.map