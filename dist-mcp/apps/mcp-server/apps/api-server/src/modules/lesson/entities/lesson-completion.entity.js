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
exports.LessonCompletion = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const course_entity_1 = require("../../course/entities/course.entity");
const lesson_entity_1 = require("./lesson.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const lesson_completion_status_enum_1 = require("../domain/lesson-completion-status.enum");
let LessonCompletion = class LessonCompletion extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, data = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, data));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { status: { required: true, enum: require("../domain/lesson-completion-status.enum").LessonCompletionStatus }, lesson_id: { required: true, type: () => String }, course_id: { required: true, type: () => String }, user_id: { required: true, type: () => String }, lesson: { required: false, type: () => require("./lesson.entity").Lesson }, course: { required: false, type: () => require("../../course/entities/course.entity").Course }, user: { required: false, type: () => require("../../user/entities/user.entity").User } };
    }
};
exports.LessonCompletion = LessonCompletion;
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: lesson_completion_status_enum_1.LessonCompletionStatus, default: lesson_completion_status_enum_1.LessonCompletionStatus.TUTORIAL }),
    __metadata("design:type", String)
], LessonCompletion.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], LessonCompletion.prototype, "lesson_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], LessonCompletion.prototype, "course_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], LessonCompletion.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => lesson_entity_1.Lesson, (lesson) => lesson.id),
    (0, typeorm_1.JoinColumn)({ name: 'lesson_id' }),
    __metadata("design:type", lesson_entity_1.Lesson)
], LessonCompletion.prototype, "lesson", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => course_entity_1.Course, (course) => course.id),
    (0, typeorm_1.JoinColumn)({ name: 'course_id' }),
    __metadata("design:type", course_entity_1.Course)
], LessonCompletion.prototype, "course", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.id),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], LessonCompletion.prototype, "user", void 0);
exports.LessonCompletion = LessonCompletion = __decorate([
    (0, typeorm_1.Entity)('lesson-completions'),
    __metadata("design:paramtypes", [Object, Object])
], LessonCompletion);
//# sourceMappingURL=lesson-completion.entity.js.map