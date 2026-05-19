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
exports.Note = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const completed_activity_entity_1 = require("../../activity/entities/completed-activity.entity");
const note_tag_entity_1 = require("./note-tag.entity");
const to_do_entity_1 = require("../../to-do/entities/to-do.entity");
let Note = class Note extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, note = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, note));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { user_id: { required: false, type: () => String }, title: { required: true, type: () => String }, body: { required: false, type: () => String }, completed_activity_id: { required: false, type: () => String }, is_brain_dump: { required: true, type: () => Boolean }, user: { required: false, type: () => require("../../user/entities/user.entity").User }, completed_activity: { required: false, type: () => require("../../activity/entities/completed-activity.entity").CompletedActivity }, tags: { required: false, type: () => [require("./note-tag.entity").NoteTag] }, embedded_todos: { required: false, type: () => [require("../../to-do/entities/to-do.entity").ToDo] } };
    }
};
exports.Note = Note;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: false,
    }),
    __metadata("design:type", String)
], Note.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'text',
        nullable: false,
        transformer: base_entity_entity_1.BaseEntity.encryptField('note_title'),
    }),
    __metadata("design:type", String)
], Note.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'text',
        nullable: true,
        transformer: base_entity_entity_1.BaseEntity.encryptField('note_body'),
    }),
    __metadata("design:type", String)
], Note.prototype, "body", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
    }),
    __metadata("design:type", String)
], Note.prototype, "completed_activity_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        nullable: false,
        default: false,
    }),
    __metadata("design:type", Boolean)
], Note.prototype, "is_brain_dump", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], Note.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => completed_activity_entity_1.CompletedActivity, { onDelete: 'SET NULL', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'completed_activity_id' }),
    __metadata("design:type", completed_activity_entity_1.CompletedActivity)
], Note.prototype, "completed_activity", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => note_tag_entity_1.NoteTag, (tag) => tag.notes, { cascade: true, eager: true }),
    (0, typeorm_1.JoinTable)({
        name: 'notes_tags',
        joinColumn: { name: 'note_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
    }),
    __metadata("design:type", Array)
], Note.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => to_do_entity_1.ToDo, { cascade: false }),
    (0, typeorm_1.JoinTable)({
        name: 'notes_todos',
        joinColumn: { name: 'note_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'todo_id', referencedColumnName: 'id' },
    }),
    __metadata("design:type", Array)
], Note.prototype, "embedded_todos", void 0);
exports.Note = Note = __decorate([
    (0, typeorm_1.Entity)('notes'),
    __metadata("design:paramtypes", [Object, Object])
], Note);
//# sourceMappingURL=note.entity.js.map