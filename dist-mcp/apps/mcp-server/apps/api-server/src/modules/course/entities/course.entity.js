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
exports.Course = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const lesson_entity_1 = require("../../lesson/entities/lesson.entity");
const course_rating_entity_1 = require("./course-rating.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const lesson_completion_entity_1 = require("../../lesson/entities/lesson-completion.entity");
const course_enrolment_entity_1 = require("./course-enrolment.entity");
const platform_enum_1 = require("../../../shared/domain/platform.enum");
let Course = class Course extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, data = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, data));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { author_id: { required: true, type: () => String }, name: { required: true, type: () => String }, description: { required: true, type: () => String }, is_hidden: { required: true, type: () => Boolean }, deleted: { required: true, type: () => Boolean }, platform: { required: true, enum: require("../../../shared/domain/platform.enum").Platform }, author: { required: false, type: () => require("../../user/entities/user.entity").User }, lessonCompletions: { required: false, type: () => [require("../../lesson/entities/lesson-completion.entity").LessonCompletion] }, lessons: { required: false, type: () => [require("../../lesson/entities/lesson.entity").Lesson] }, ratings: { required: false, type: () => [require("./course-rating.entity").CourseRating] }, enrollments: { required: false, type: () => [require("./course-enrolment.entity").CourseEnrolment] } };
    }
};
exports.Course = Course;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], Course.prototype, "author_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Course.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Course.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Course.prototype, "is_hidden", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Course.prototype, "deleted", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'enum', enum: platform_enum_1.Platform, default: platform_enum_1.Platform.WEB }),
    __metadata("design:type", String)
], Course.prototype, "platform", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.id, { onDelete: 'SET NULL', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'author_id' }),
    __metadata("design:type", user_entity_1.User)
], Course.prototype, "author", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => lesson_completion_entity_1.LessonCompletion, (lesson_completion) => lesson_completion.course),
    __metadata("design:type", Array)
], Course.prototype, "lessonCompletions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => lesson_entity_1.Lesson, (lesson) => lesson.course),
    __metadata("design:type", Array)
], Course.prototype, "lessons", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => course_rating_entity_1.CourseRating, (courseRating) => courseRating.course),
    __metadata("design:type", Array)
], Course.prototype, "ratings", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => course_enrolment_entity_1.CourseEnrolment, (course_enrolment) => course_enrolment.course),
    __metadata("design:type", Array)
], Course.prototype, "enrollments", void 0);
exports.Course = Course = __decorate([
    (0, typeorm_1.Entity)('courses'),
    __metadata("design:paramtypes", [Object, Object])
], Course);
//# sourceMappingURL=course.entity.js.map