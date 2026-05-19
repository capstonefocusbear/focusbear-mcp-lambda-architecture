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
exports.User = exports.EmailFrequency = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_entity_1 = require("../../../shared/entities/base-entity.entity");
const activity_sequence_entity_1 = require("../../activity/entities/activity-sequence.entity");
const activity_entity_1 = require("../../activity/entities/activity.entity");
const completed_activity_sequence_entity_1 = require("../../activity/entities/completed-activity-sequence.entity");
const completed_activity_entity_1 = require("../../activity/entities/completed-activity.entity");
const device_entity_1 = require("../../device/entities/device.entity");
const focus_mode_entity_1 = require("../../focus-mode/entities/focus-mode.entity");
const blocking_schedule_entity_1 = require("../../focus-mode/entities/blocking-schedule.entity");
const activity_template_entity_1 = require("../../activity-template/entity/activity-template.entity");
const habit_pack_entity_1 = require("../../habit-pack/entity/habit-pack.entity");
const installed_pack_entity_1 = require("../../habit-pack/entity/installed-pack.entity");
const team_entity_1 = require("../../team/entities/team.entity");
const update_local_device_settings_dto_1 = require("../dto/update-local-device-settings.dto");
const user_types_enum_1 = require("../domain/user-types.enum");
const notification_entity_1 = require("../../notification/entities/notification.entity");
const focus_mode_template_entity_1 = require("../../focus-mode-template/entities/focus-mode-template.entity");
const installed_focus_mode_templates_entity_1 = require("../../focus-mode-template/entities/installed-focus-mode_templates.entity");
const user_metadata_model_1 = require("../domain/user-metadata.model");
const user_consent_entity_1 = require("./user-consent.entity");
const user_onboarding_progress_model_1 = require("../domain/user-onboarding-progress.model");
const completed_focus_block_entity_1 = require("../../focus-mode/entities/completed-focus-block.entity");
const numeric_column_transformer_1 = require("../../../shared/transformers/numeric-column-transformer");
const log_quantity_answers_1 = require("../../activity/entities/log-quantity-answers");
const log_quantity_questions_1 = require("../../activity/entities/log-quantity-questions");
const saved_website_entity_1 = require("../../saved-website/entities/saved-website.entity");
const routine_notification_times_model_1 = require("../domain/routine-notification-times.model");
const language_options_enum_1 = require("../../../shared/domain/language-options.enum");
const to_do_entity_1 = require("../../to-do/entities/to-do.entity");
const subscription_status_model_1 = require("../../subscription/domain/subscription-status.model");
const impact_event_entity_1 = require("../../events/entities/impact-event.entity");
const user_feedback_entity_1 = require("./user-feedback.entity");
const tasks_time_logs_entity_1 = require("../../to-do/entities/tasks-time-logs.entity");
const platform_integration_entity_1 = require("../../platform-integrations/entities/platform-integration.entity");
const synced_project_entity_1 = require("../../to-do/entities/synced-project.entity");
const calendar_excluded_keywords_entity_1 = require("../../calendar/entities/calendar-excluded-keywords.entity");
const calendar_entity_1 = require("../../calendar/entities/calendar.entity");
const team_to_member_entity_1 = require("../../team/entities/team-to-member.entity");
const team_to_admin_entity_1 = require("../../team/entities/team-to-admin.entity");
const accountability_buddy_entity_1 = require("../../accountability-buddy/entities/accountability-buddy.entity");
const tutorial_entity_1 = require("../../activity/entities/tutorial.entity");
const feedback_entity_1 = require("../../../../../../libs/stripe/src/entities/feedback.entity");
const custom_routine_1 = require("./custom-routine");
var EmailFrequency;
(function (EmailFrequency) {
    EmailFrequency["DAILY"] = "daily";
    EmailFrequency["WEEKLY"] = "weekly";
    EmailFrequency["MONTHLY"] = "monthly";
    EmailFrequency["UNSUBSCRIBED"] = "unsubscribed";
})(EmailFrequency || (exports.EmailFrequency = EmailFrequency = {}));
let User = class User extends base_entity_entity_1.BaseEntity {
    constructor(_a = {}, options) {
        var { id } = _a, user = __rest(_a, ["id"]);
        if (options === void 0) { options = { generateId: false }; }
        super(id, options);
        Object.assign(this, Object.assign({}, user));
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { stripe_customer_id: { required: false, type: () => String, nullable: true }, profitwell_id: { required: false, type: () => String }, profitwell_registration_date: { required: false, type: () => Date }, auth0_id: { required: false, type: () => String }, startup_time: { required: false, type: () => String }, shutdown_time: { required: false, type: () => String }, utc_startup_time: { required: false, type: () => String }, utc_shutdown_time: { required: false, type: () => String }, routine_notification_times: { required: false, type: () => require("../domain/routine-notification-times.model").RoutineNotificationTimes }, break_after_minutes: { required: false, type: () => Number }, current_focus_mode_finish_time: { required: false, type: () => Date }, password_for_settings: { required: false, type: () => String }, is_office_mode_activated: { required: false, type: () => Boolean }, current_activity_sequence_id: { required: false, type: () => String }, current_focus_mode_id: { required: false, type: () => String }, current_completing_focus_block_id: { required: false, type: () => String }, current_activity_id: { required: false, type: () => String }, current_activity_assigned_at: { required: false, type: () => Date }, last_completed_sequence_id: { required: false, type: () => String }, current_completing_sequence_log_id: { required: false, type: () => String }, last_completed_sequence_at: { required: false, type: () => Date }, last_completed_sequence_started_at: { required: false, type: () => Date }, current_sequence_started_at: { required: false, type: () => Date }, local_device_settings: { required: false, type: () => require("../dto/update-local-device-settings.dto").UpdateLocalDeviceSettingsDto }, user_type: { required: false, enum: require("../domain/user-types.enum").UserTypes }, signed_up_via_habit_pack: { required: false, type: () => String }, signed_up_via_focus_mode: { required: false, type: () => String }, current_sequence_skipped_activities: { required: false, type: () => [String] }, timezone: { required: false, type: () => String }, has_edited_settings: { required: false, type: () => Boolean }, cutoff_time_for_non_high_priority_activities: { required: false, type: () => String }, metadata: { required: false, type: () => require("../domain/user-metadata.model").UserMetadata }, user_job_details: { required: false, type: () => String }, user_typical_distractions: { required: false, type: () => String }, onboarding_progress: { required: false, type: () => require("../domain/user-onboarding-progress.model").UserOnboardingProgress }, last_time_stats_updated: { required: false, type: () => Date }, last_completed_focus_mode_at: { required: false, type: () => Date }, morning_routines_streak: { required: false, type: () => Number }, evening_routines_streak: { required: false, type: () => Number }, focus_modes_streak: { required: false, type: () => Number }, micro_breaks_streak: { required: false, type: () => Number }, morning_percent_number_day_of_stats_completed: { required: false, type: () => Number }, evening_percent_number_day_of_stats_completed: { required: false, type: () => Number }, micro_percent_number_day_of_stats_completed: { required: false, type: () => Number }, morning_number_days_completed: { required: false, type: () => Number }, morning_num_days_of_stats: { required: false, type: () => Number }, evening_number_days_completed: { required: false, type: () => Number }, evening_num_days_of_stats: { required: false, type: () => Number }, micro_breaks_number_days_completed: { required: false, type: () => Number }, micro_breaks_num_days_of_stats: { required: false, type: () => Number }, focus_modes_number_days_completed: { required: false, type: () => Number }, focus_modes_num_days_of_stats: { required: false, type: () => Number }, num_days_of_stats: { required: false, type: () => Number }, number_days_completed: { required: false, type: () => Number }, has_consented_to_terms_of_service: { required: false, type: () => Boolean }, has_consented_to_privacy_policy: { required: false, type: () => Boolean }, long_term_goals: { required: false, type: () => [String] }, verbose_logging: { required: false, type: () => Boolean }, last_time_user_settings_modified: { required: false, type: () => Date }, username: { required: false, type: () => String }, has_received_inactivity_warning: { required: false, type: () => Boolean }, language: { required: false, type: () => String }, email_frequency: { required: false, enum: require("./user.entity").EmailFrequency }, feature_flags: { required: false, type: () => [String] }, revenue_cat_data: { required: false, type: () => require("../../subscription/domain/subscription-status.model").SubscriptionStatus }, revenue_cat_status: { required: false, type: () => String }, last_date_revenue_cat_data_synced: { required: false, type: () => Date }, last_status_synced_with_profitwell: { required: false, type: () => String }, last_date_gave_feedback: { required: false, type: () => Date }, is_relax_activity_generated: { required: false, type: () => Boolean }, synced_projects: { required: false, type: () => [require("../../to-do/entities/synced-project.entity").SyncedProject] }, consents: { required: false, type: () => [require("./user-consent.entity").UserConsent] }, activity_sequences: { required: false, type: () => [require("../../activity/entities/activity-sequence.entity").ActivitySequence] }, completed_activities: { required: false, type: () => [require("../../activity/entities/completed-activity.entity").CompletedActivity] }, completed_activity_sequences: { required: false, type: () => [require("../../activity/entities/completed-activity-sequence.entity").CompletedActivitySequence] }, completed_focus_blocks: { required: false, type: () => [require("../../focus-mode/entities/completed-focus-block.entity").CompletedFocusBlock] }, devices: { required: false, type: () => [require("../../device/entities/device.entity").Device] }, to_dos: { required: false, type: () => [require("../../to-do/entities/to-do.entity").ToDo] }, notifications: { required: false, type: () => [require("../../notification/entities/notification.entity").Notification] }, focus_modes: { required: false, type: () => [require("../../focus-mode/entities/focus-mode.entity").FocusMode] }, blocking_schedules: { required: false, type: () => [require("../../focus-mode/entities/blocking-schedule.entity").BlockingSchedule] }, focus_mode_templates: { required: false, type: () => [require("../../focus-mode-template/entities/focus-mode-template.entity").FocusModeTemplate] }, created_habit_packs: { required: false, type: () => [require("../../habit-pack/entity/habit-pack.entity").HabitPack] }, installed_packs: { required: false, type: () => [require("../../habit-pack/entity/installed-pack.entity").InstalledPack] }, installed_focus_modes: { required: false, type: () => [require("../../focus-mode-template/entities/installed-focus-mode_templates.entity").InstalledFocusModeTemplate] }, activity_templates: { required: false, type: () => [require("../../activity-template/entity/activity-template.entity").ActivityTemplate] }, activities: { required: false, type: () => [require("../../activity/entities/activity.entity").Activity] }, log_quantity_questions: { required: false, type: () => [require("../../activity/entities/log-quantity-questions").LogQuantityQuestion] }, log_quantity_answers: { required: false, type: () => [require("../../activity/entities/log-quantity-answers").LogQuantityAnswer] }, saved_websites: { required: false, type: () => [require("../../saved-website/entities/saved-website.entity").SavedWebsite] }, impact_events: { required: false, type: () => [require("../../events/entities/impact-event.entity").ImpactEvent] }, feedback: { required: false, type: () => [require("./user-feedback.entity").UserFeedback] }, task_time_logs: { required: false, type: () => [require("../../to-do/entities/tasks-time-logs.entity").TaskTimeLog] }, platform_integrations: { required: false, type: () => [require("../../platform-integrations/entities/platform-integration.entity").PlatformIntegration] }, owned_teams: { required: false, type: () => [require("../../team/entities/team.entity").Team] }, calendar_keywords: { required: false, type: () => [require("../../calendar/entities/calendar-excluded-keywords.entity").CalendarExcludedKeyword] }, calendars: { required: false, type: () => [require("../../calendar/entities/calendar.entity").Calendar] }, teamToMember: { required: false, type: () => [require("../../team/entities/team-to-member.entity").TeamToMember] }, teamToAdmin: { required: false, type: () => [require("../../team/entities/team-to-admin.entity").TeamToAdmin] }, accountability_buddies: { required: false, type: () => [require("../../accountability-buddy/entities/accountability-buddy.entity").AccountabilityBuddy] }, sign_up_habit_pack: { required: false, type: () => require("./user.entity").User }, current_activity: { required: false, type: () => require("../../activity/entities/activity.entity").Activity }, current_activity_sequence: { required: false, type: () => require("../../activity/entities/activity-sequence.entity").ActivitySequence }, last_completed_sequence: { required: false, type: () => require("../../activity/entities/activity-sequence.entity").ActivitySequence }, completing_sequence_log: { required: false, type: () => require("../../activity/entities/completed-activity-sequence.entity").CompletedActivitySequence }, completing_focus_block: { required: false, type: () => require("../../focus-mode/entities/completed-focus-block.entity").CompletedFocusBlock }, current_focus_mode: { required: false, type: () => require("../../focus-mode/entities/focus-mode.entity").FocusMode }, tutorials: { required: false, type: () => [require("../../activity/entities/tutorial.entity").Tutorial] }, cancel_subscription_feedback: { required: false, type: () => require("../../../../../../libs/stripe/src/entities/feedback.entity").Feedback }, custom_routines: { required: false, type: () => [require("./custom-routine").CustomRoutine] } };
    }
};
exports.User = User;
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 255,
        unique: true,
        nullable: true,
    }),
    __metadata("design:type", String)
], User.prototype, "stripe_customer_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 255,
        nullable: true,
    }),
    __metadata("design:type", String)
], User.prototype, "profitwell_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
        nullable: true,
    }),
    __metadata("design:type", Date)
], User.prototype, "profitwell_registration_date", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 255,
        nullable: false,
        unique: true,
    }),
    __metadata("design:type", String)
], User.prototype, "auth0_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 255,
    }),
    __metadata("design:type", String)
], User.prototype, "startup_time", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 255,
    }),
    __metadata("design:type", String)
], User.prototype, "shutdown_time", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 255,
        nullable: true,
    }),
    __metadata("design:type", String)
], User.prototype, "utc_startup_time", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 255,
        nullable: true,
    }),
    __metadata("design:type", String)
], User.prototype, "utc_shutdown_time", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        default: { last_time_notified_of_morning_routine: null, last_time_notified_of_evening_routine: null },
    }),
    __metadata("design:type", routine_notification_times_model_1.RoutineNotificationTimes)
], User.prototype, "routine_notification_times", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 255,
    }),
    __metadata("design:type", Number)
], User.prototype, "break_after_minutes", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], User.prototype, "current_focus_mode_finish_time", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 255,
        select: false,
    }),
    __metadata("design:type", String)
], User.prototype, "password_for_settings", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
    }),
    __metadata("design:type", Boolean)
], User.prototype, "is_office_mode_activated", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
    }),
    __metadata("design:type", String)
], User.prototype, "current_activity_sequence_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
    }),
    __metadata("design:type", String)
], User.prototype, "current_focus_mode_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
    }),
    __metadata("design:type", String)
], User.prototype, "current_completing_focus_block_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
    }),
    __metadata("design:type", String)
], User.prototype, "current_activity_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], User.prototype, "current_activity_assigned_at", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
        nullable: true,
    }),
    __metadata("design:type", String)
], User.prototype, "last_completed_sequence_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
    }),
    __metadata("design:type", String)
], User.prototype, "current_completing_sequence_log_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], User.prototype, "last_completed_sequence_at", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], User.prototype, "last_completed_sequence_started_at", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], User.prototype, "current_sequence_started_at", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        transformer: base_entity_entity_1.BaseEntity.encryptJSONField('local_device_settings'),
    }),
    __metadata("design:type", update_local_device_settings_dto_1.UpdateLocalDeviceSettingsDto)
], User.prototype, "local_device_settings", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        name: 'user_type',
        enum: user_types_enum_1.UserTypes,
        default: user_types_enum_1.UserTypes.STANDARD,
    }),
    __metadata("design:type", String)
], User.prototype, "user_type", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
    }),
    __metadata("design:type", String)
], User.prototype, "signed_up_via_habit_pack", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'uuid',
    }),
    __metadata("design:type", String)
], User.prototype, "signed_up_via_focus_mode", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
    }),
    __metadata("design:type", Array)
], User.prototype, "current_sequence_skipped_activities", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        default: 'UTC',
    }),
    __metadata("design:type", String)
], User.prototype, "timezone", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], User.prototype, "has_edited_settings", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
    }),
    __metadata("design:type", String)
], User.prototype, "cutoff_time_for_non_high_priority_activities", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        transformer: base_entity_entity_1.BaseEntity.encryptJSONField('metadata'),
    }),
    __metadata("design:type", user_metadata_model_1.UserMetadata)
], User.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'text',
        nullable: true,
        transformer: base_entity_entity_1.BaseEntity.encryptField('user_job_details'),
    }),
    __metadata("design:type", String)
], User.prototype, "user_job_details", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'text',
        nullable: true,
        transformer: base_entity_entity_1.BaseEntity.encryptField('user_typical_distractions'),
    }),
    __metadata("design:type", String)
], User.prototype, "user_typical_distractions", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
    }),
    __metadata("design:type", user_onboarding_progress_model_1.UserOnboardingProgress)
], User.prototype, "onboarding_progress", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], User.prototype, "last_time_stats_updated", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], User.prototype, "last_completed_focus_mode_at", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], User.prototype, "morning_routines_streak", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], User.prototype, "evening_routines_streak", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], User.prototype, "focus_modes_streak", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], User.prototype, "micro_breaks_streak", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'decimal',
        default: 0,
    }),
    __metadata("design:type", Number)
], User.prototype, "morning_percent_number_day_of_stats_completed", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'decimal',
        default: 0,
    }),
    __metadata("design:type", Number)
], User.prototype, "evening_percent_number_day_of_stats_completed", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'decimal',
        default: 0,
    }),
    __metadata("design:type", Number)
], User.prototype, "micro_percent_number_day_of_stats_completed", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], User.prototype, "morning_number_days_completed", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], User.prototype, "morning_num_days_of_stats", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], User.prototype, "evening_number_days_completed", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], User.prototype, "evening_num_days_of_stats", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], User.prototype, "micro_breaks_number_days_completed", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], User.prototype, "micro_breaks_num_days_of_stats", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], User.prototype, "focus_modes_number_days_completed", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], User.prototype, "focus_modes_num_days_of_stats", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], User.prototype, "num_days_of_stats", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'numeric',
        default: 0,
        transformer: new numeric_column_transformer_1.ColumnNumericTransformer(),
    }),
    __metadata("design:type", Number)
], User.prototype, "number_days_completed", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], User.prototype, "has_consented_to_terms_of_service", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        nullable: true,
        transformer: {
            to: (value) => value,
            from: (value) => !!value,
        },
    }),
    __metadata("design:type", Boolean)
], User.prototype, "has_consented_to_privacy_policy", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        nullable: true,
        transformer: base_entity_entity_1.BaseEntity.encryptJSONField('long_term_goals'),
    }),
    __metadata("design:type", Array)
], User.prototype, "long_term_goals", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], User.prototype, "verbose_logging", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], User.prototype, "last_time_user_settings_modified", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: true,
        unique: true,
        length: 30,
    }),
    __metadata("design:type", String)
], User.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], User.prototype, "has_received_inactivity_warning", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        default: language_options_enum_1.LanguageOptions.ENGLISH,
    }),
    __metadata("design:type", String)
], User.prototype, "language", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: EmailFrequency,
        default: EmailFrequency.WEEKLY,
    }),
    __metadata("design:type", String)
], User.prototype, "email_frequency", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        nullable: false,
        default: () => "'[]'::jsonb",
    }),
    __metadata("design:type", Array)
], User.prototype, "feature_flags", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        nullable: true,
        transformer: base_entity_entity_1.BaseEntity.encryptJSONField('revenue_cat_data'),
    }),
    __metadata("design:type", subscription_status_model_1.SubscriptionStatus)
], User.prototype, "revenue_cat_data", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: true,
    }),
    __metadata("design:type", String)
], User.prototype, "revenue_cat_status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
        nullable: true,
    }),
    __metadata("design:type", Date)
], User.prototype, "last_date_revenue_cat_data_synced", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        nullable: true,
    }),
    __metadata("design:type", String)
], User.prototype, "last_status_synced_with_profitwell", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
        nullable: true,
    }),
    __metadata("design:type", Date)
], User.prototype, "last_date_gave_feedback", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        nullable: true,
    }),
    __metadata("design:type", Boolean)
], User.prototype, "is_relax_activity_generated", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => synced_project_entity_1.SyncedProject, (syncedProject) => syncedProject.user),
    __metadata("design:type", Array)
], User.prototype, "synced_projects", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => user_consent_entity_1.UserConsent, (consent) => consent.user),
    __metadata("design:type", Array)
], User.prototype, "consents", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => activity_sequence_entity_1.ActivitySequence, (sequence) => sequence.user),
    __metadata("design:type", Array)
], User.prototype, "activity_sequences", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => completed_activity_entity_1.CompletedActivity, (completed_activity) => completed_activity.user),
    __metadata("design:type", Array)
], User.prototype, "completed_activities", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => completed_activity_sequence_entity_1.CompletedActivitySequence, (completed_sequence) => completed_sequence.user),
    __metadata("design:type", Array)
], User.prototype, "completed_activity_sequences", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => completed_focus_block_entity_1.CompletedFocusBlock, (completed_focus_block) => completed_focus_block.user),
    __metadata("design:type", Array)
], User.prototype, "completed_focus_blocks", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => device_entity_1.Device, (device) => device.user),
    __metadata("design:type", Array)
], User.prototype, "devices", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => to_do_entity_1.ToDo, (to_do) => to_do.user),
    __metadata("design:type", Array)
], User.prototype, "to_dos", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => notification_entity_1.Notification, (notification) => notification.user),
    __metadata("design:type", Array)
], User.prototype, "notifications", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => focus_mode_entity_1.FocusMode, (focus_mode) => focus_mode.user),
    __metadata("design:type", Array)
], User.prototype, "focus_modes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => blocking_schedule_entity_1.BlockingSchedule, (blocking_schedule) => blocking_schedule.user),
    __metadata("design:type", Array)
], User.prototype, "blocking_schedules", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => focus_mode_template_entity_1.FocusModeTemplate, (focus_mode_template) => focus_mode_template.author),
    __metadata("design:type", Array)
], User.prototype, "focus_mode_templates", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => habit_pack_entity_1.HabitPack, (habit_pack) => habit_pack.user),
    __metadata("design:type", Array)
], User.prototype, "created_habit_packs", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => installed_pack_entity_1.InstalledPack, (installed_packs) => installed_packs.user),
    __metadata("design:type", Array)
], User.prototype, "installed_packs", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => installed_focus_mode_templates_entity_1.InstalledFocusModeTemplate, (installed_packs) => installed_packs.user),
    __metadata("design:type", Array)
], User.prototype, "installed_focus_modes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => activity_template_entity_1.ActivityTemplate, (activity_template) => activity_template.user),
    __metadata("design:type", Array)
], User.prototype, "activity_templates", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => activity_entity_1.Activity, (activities) => activities.user_activities),
    __metadata("design:type", Array)
], User.prototype, "activities", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => log_quantity_questions_1.LogQuantityQuestion, (question) => question.user),
    __metadata("design:type", Array)
], User.prototype, "log_quantity_questions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => log_quantity_answers_1.LogQuantityAnswer, (answer) => answer.user),
    __metadata("design:type", Array)
], User.prototype, "log_quantity_answers", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => saved_website_entity_1.SavedWebsite, (website) => website.user),
    __metadata("design:type", Array)
], User.prototype, "saved_websites", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => impact_event_entity_1.ImpactEvent, (impactEvent) => impactEvent.user),
    __metadata("design:type", Array)
], User.prototype, "impact_events", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => user_feedback_entity_1.UserFeedback, (userFeedback) => userFeedback.user),
    __metadata("design:type", Array)
], User.prototype, "feedback", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => tasks_time_logs_entity_1.TaskTimeLog, (timeLog) => timeLog.user),
    __metadata("design:type", Array)
], User.prototype, "task_time_logs", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => platform_integration_entity_1.PlatformIntegration, (platformIntegration) => platformIntegration.user),
    __metadata("design:type", Array)
], User.prototype, "platform_integrations", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => team_entity_1.Team, (team) => team.owner),
    __metadata("design:type", Array)
], User.prototype, "owned_teams", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => calendar_excluded_keywords_entity_1.CalendarExcludedKeyword, (calendarKeyword) => calendarKeyword.user),
    __metadata("design:type", Array)
], User.prototype, "calendar_keywords", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => calendar_entity_1.Calendar, (calendar) => calendar.user),
    __metadata("design:type", Array)
], User.prototype, "calendars", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => team_to_member_entity_1.TeamToMember, (teamToMember) => teamToMember.member),
    __metadata("design:type", Array)
], User.prototype, "teamToMember", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => team_to_admin_entity_1.TeamToAdmin, (teamToAdmin) => teamToAdmin.admin),
    __metadata("design:type", Array)
], User.prototype, "teamToAdmin", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => accountability_buddy_entity_1.AccountabilityBuddy, (accountabilityBuddy) => accountabilityBuddy.user),
    __metadata("design:type", Array)
], User.prototype, "accountability_buddies", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => habit_pack_entity_1.HabitPack, (habit_pack) => habit_pack.id, { onDelete: 'NO ACTION', onUpdate: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'signed_up_via_habit_pack' }),
    __metadata("design:type", User)
], User.prototype, "sign_up_habit_pack", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => activity_entity_1.Activity, (activity) => activity.id, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'current_activity_id' }),
    __metadata("design:type", activity_entity_1.Activity)
], User.prototype, "current_activity", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => activity_sequence_entity_1.ActivitySequence, (sequence) => sequence.user, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'current_activity_sequence_id' }),
    __metadata("design:type", activity_sequence_entity_1.ActivitySequence)
], User.prototype, "current_activity_sequence", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => activity_sequence_entity_1.ActivitySequence, (sequence) => sequence.user, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'last_completed_sequence_id' }),
    __metadata("design:type", activity_sequence_entity_1.ActivitySequence)
], User.prototype, "last_completed_sequence", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => completed_activity_sequence_entity_1.CompletedActivitySequence, (sequence_log) => sequence_log.user),
    (0, typeorm_1.JoinColumn)({ name: 'current_completing_sequence_log_id' }),
    __metadata("design:type", completed_activity_sequence_entity_1.CompletedActivitySequence)
], User.prototype, "completing_sequence_log", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => completed_focus_block_entity_1.CompletedFocusBlock, (focusBlock) => focusBlock.user),
    (0, typeorm_1.JoinColumn)({ name: 'current_completing_focus_block_id' }),
    __metadata("design:type", completed_focus_block_entity_1.CompletedFocusBlock)
], User.prototype, "completing_focus_block", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => focus_mode_entity_1.FocusMode, (mode) => mode.user),
    (0, typeorm_1.JoinColumn)({ name: 'current_focus_mode_id' }),
    __metadata("design:type", focus_mode_entity_1.FocusMode)
], User.prototype, "current_focus_mode", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => tutorial_entity_1.Tutorial, (tutorial) => tutorial.user),
    __metadata("design:type", Array)
], User.prototype, "tutorials", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => feedback_entity_1.Feedback, (feedback) => feedback.cancel_subscription_reason),
    __metadata("design:type", feedback_entity_1.Feedback)
], User.prototype, "cancel_subscription_feedback", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => custom_routine_1.CustomRoutine, (custom_routine) => custom_routine.user),
    __metadata("design:type", Array)
], User.prototype, "custom_routines", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users'),
    __metadata("design:paramtypes", [Object, Object])
], User);
//# sourceMappingURL=user.entity.js.map