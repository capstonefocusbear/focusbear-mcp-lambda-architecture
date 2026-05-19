"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncTask = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const async_task_status_enum_1 = require("../domain/async-task-status.enum");
let AsyncTask = class AsyncTask extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, asyncTask = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, asyncTask));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { status: { required: false, enum: require("../domain/async-task-status.enum").AsyncTaskStatus }, metadata: { required: false, type: () => Object } };
    }
};
exports.AsyncTask = AsyncTask;
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: async_task_status_enum_1.AsyncTaskStatus,
        default: async_task_status_enum_1.AsyncTaskStatus.PENDING,
        nullable: false,
    }),
    __metadata("design:type", String)
], AsyncTask.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        nullable: true,
    }),
    __metadata("design:type", Object)
], AsyncTask.prototype, "metadata", void 0);
exports.AsyncTask = AsyncTask = __decorate([
    (0, typeorm_1.Entity)('async_tasks'),
    __metadata("design:paramtypes", [Object, Object])
], AsyncTask);
//# sourceMappingURL=async-task.entity.js.map