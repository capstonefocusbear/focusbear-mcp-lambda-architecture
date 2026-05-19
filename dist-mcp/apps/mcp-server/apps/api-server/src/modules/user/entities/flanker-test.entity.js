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
exports.FlankerTest = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const study_participant_entity_1 = require("./study-participant.entity");
let FlankerTest = class FlankerTest {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, studyParticipantId: { required: true, type: () => String }, studyParticipant: { required: true, type: () => require("./study-participant.entity").StudyParticipant }, totalTrials: { required: true, type: () => Number }, missedTrials: { required: true, type: () => Number }, overallAccuracy: { required: true, type: () => Number }, congruentAccuracy: { required: true, type: () => Number }, incongruentAccuracy: { required: true, type: () => Number }, meanRtCongruent: { required: true, type: () => Number }, meanRtIncongruent: { required: true, type: () => Number }, trialResults: { required: true, type: () => [Object] }, createdAt: { required: true, type: () => Date }, updatedAt: { required: true, type: () => Date } };
    }
};
exports.FlankerTest = FlankerTest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], FlankerTest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'study_participant_id' }),
    __metadata("design:type", String)
], FlankerTest.prototype, "studyParticipantId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => study_participant_entity_1.StudyParticipant),
    (0, typeorm_1.JoinColumn)({ name: 'study_participant_id' }),
    __metadata("design:type", study_participant_entity_1.StudyParticipant)
], FlankerTest.prototype, "studyParticipant", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_trials' }),
    __metadata("design:type", Number)
], FlankerTest.prototype, "totalTrials", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'missed_trials' }),
    __metadata("design:type", Number)
], FlankerTest.prototype, "missedTrials", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'overall_accuracy', type: 'decimal', precision: 4, scale: 3 }),
    __metadata("design:type", Number)
], FlankerTest.prototype, "overallAccuracy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'congruent_accuracy', type: 'decimal', precision: 4, scale: 3 }),
    __metadata("design:type", Number)
], FlankerTest.prototype, "congruentAccuracy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'incongruent_accuracy', type: 'decimal', precision: 4, scale: 3 }),
    __metadata("design:type", Number)
], FlankerTest.prototype, "incongruentAccuracy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mean_rt_congruent' }),
    __metadata("design:type", Number)
], FlankerTest.prototype, "meanRtCongruent", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mean_rt_incongruent' }),
    __metadata("design:type", Number)
], FlankerTest.prototype, "meanRtIncongruent", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'trial_results', type: 'jsonb' }),
    __metadata("design:type", Array)
], FlankerTest.prototype, "trialResults", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], FlankerTest.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], FlankerTest.prototype, "updatedAt", void 0);
exports.FlankerTest = FlankerTest = __decorate([
    (0, typeorm_1.Entity)('flanker_tests')
], FlankerTest);
//# sourceMappingURL=flanker-test.entity.js.map