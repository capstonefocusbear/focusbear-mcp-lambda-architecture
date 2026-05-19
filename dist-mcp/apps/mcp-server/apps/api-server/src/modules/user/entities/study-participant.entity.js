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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudyParticipant = exports.AppActivationStatus = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
var AppActivationStatus;
(function (AppActivationStatus) {
    AppActivationStatus["DATA_COLLECTION_MODE"] = "data_collection_mode";
    AppActivationStatus["ALL_INTERVENTIONS_ACTIVE"] = "all_interventions_active";
    AppActivationStatus["END_OF_STUDY"] = "end_of_study";
})(AppActivationStatus || (exports.AppActivationStatus = AppActivationStatus = {}));
let StudyParticipant = class StudyParticipant extends base_entity_entity_1.BaseEntity {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, participantCode: { required: true, type: () => String }, email: { required: true, type: () => String }, name: { required: true, type: () => String }, userId: { required: true, type: () => String }, metadata: { required: true, type: () => Object }, assignedGroup: { required: true, type: () => String }, appActivationStatus: { required: true, enum: require("./study-participant.entity").AppActivationStatus }, usageDataLastReceived: { required: true, type: () => Date }, healthDataLastReceived: { required: true, type: () => Date }, lastDataSyncNotifiedAt: { required: false, type: () => Date }, reservedAt: { required: false, type: () => Date }, isQuestionnaireCompleted: { required: true, type: () => Boolean }, isEndOfStudyQuestionnaireCompleted: { required: true, type: () => Boolean }, flankerEffect: { required: true, type: () => Number }, afterStudyFlankerEffect: { required: true, type: () => Number }, phoneNumber: { required: true, type: () => String }, optedOut: { required: true, type: () => Boolean } };
    }
};
exports.StudyParticipant = StudyParticipant;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], StudyParticipant.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'participant_code', unique: true }),
    __metadata("design:type", String)
], StudyParticipant.prototype, "participantCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'email', unique: true }),
    __metadata("design:type", String)
], StudyParticipant.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'name' }),
    __metadata("design:type", String)
], StudyParticipant.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', nullable: true }),
    __metadata("design:type", String)
], StudyParticipant.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'metadata', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], StudyParticipant.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'assigned_group', nullable: true }),
    __metadata("design:type", String)
], StudyParticipant.prototype, "assignedGroup", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'app_activation_status',
        type: 'enum',
        enum: AppActivationStatus,
        default: AppActivationStatus.DATA_COLLECTION_MODE,
    }),
    __metadata("design:type", String)
], StudyParticipant.prototype, "appActivationStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'usage_data_last_received', type: 'date', nullable: true }),
    __metadata("design:type", Date)
], StudyParticipant.prototype, "usageDataLastReceived", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'health_data_last_received', type: 'date', nullable: true }),
    __metadata("design:type", Date)
], StudyParticipant.prototype, "healthDataLastReceived", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_data_sync_notified_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], StudyParticipant.prototype, "lastDataSyncNotifiedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reserved_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], StudyParticipant.prototype, "reservedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_questionnaire_completed', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], StudyParticipant.prototype, "isQuestionnaireCompleted", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_eos_questionnaire_completed', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], StudyParticipant.prototype, "isEndOfStudyQuestionnaireCompleted", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'flanker_effect', type: 'float', nullable: true }),
    __metadata("design:type", Number)
], StudyParticipant.prototype, "flankerEffect", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'after_study_flanker_effect', type: 'float', nullable: true }),
    __metadata("design:type", Number)
], StudyParticipant.prototype, "afterStudyFlankerEffect", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'phone_number',
        type: 'varchar',
        length: 255,
        nullable: true,
        transformer: base_entity_entity_1.BaseEntity.encryptField('phone_number'),
    }),
    __metadata("design:type", String)
], StudyParticipant.prototype, "phoneNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'opted_out', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], StudyParticipant.prototype, "optedOut", void 0);
exports.StudyParticipant = StudyParticipant = __decorate([
    (0, typeorm_1.Entity)('study_participants')
], StudyParticipant);
//# sourceMappingURL=study-participant.entity.js.map