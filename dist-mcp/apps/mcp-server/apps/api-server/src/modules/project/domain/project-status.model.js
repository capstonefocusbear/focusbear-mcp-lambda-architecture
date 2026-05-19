"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PROJECT_STATUSES = void 0;
const openapi = require("@nestjs/swagger");
exports.DEFAULT_PROJECT_STATUSES = [
    { id: 'default-todo', label: 'To Do', color: '#6B7280', order: 0, should_complete_task: false },
    { id: 'default-in-progress', label: 'In Progress', color: '#3B82F6', order: 1, should_complete_task: false },
    { id: 'default-done', label: 'Done', color: '#10B981', order: 2, should_complete_task: true },
];
//# sourceMappingURL=project-status.model.js.map