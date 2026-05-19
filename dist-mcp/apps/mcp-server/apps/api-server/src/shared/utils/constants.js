"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIELD_NAME_WORKLOG = exports.WORDS_TO_LOG_FOR = exports.INTERNAL_TEST = exports.EVENTS_TO_IMPACT_CATEGORIES_MAP = exports.DISTRACTION_BLOCK_EVENTS = exports.IMPACT_MEASUREMENT_EVENT_TYPES = exports.EVENT_TYPES_TO_ALERT_IN_SLACK = exports.DAYS_OF_WEEK = exports.IDS_TO_LOG_FOR = exports.JEREMYS_USER_ID = exports.UTC_TO_IANA_MAP = exports.CRON_JOB_TIMEOUT_MS = exports.TRIAL = exports.ACTIVE = exports.TRIALING = exports.USD = exports.MONTH = exports.DEFAULT_IANA_TIMEZONE = exports.USER_QUIT_TRACKING_DURATION_MILLIS = exports.USER_QUIT_TRACKING_DURATION_HOURS = exports.PERSONAL_PLAN_COST_CENTS = exports.TRIAL_LENGTH_DAYS = exports.TRIAL_COST_CENTS = exports.TWENTY = exports.TEN_SECONDS_AS_MILLIS = exports.TWO_SECONDS_AS_MILLIS = exports.ONE_SECOND_AS_MILLIS = exports.ONE_DAY_SECONDS = exports.TEN_MINUTES = exports.ONE_MINUTE_SECONDS = exports.ONE_DAY_MILLISECONDS = exports.ONE_MINUTE = exports.ONE_HOUR_MILLISECONDS = exports.ONE_HOUR_SECONDS = exports.FEATURE_FLAGS = exports.EMAIL_SENDER_NAME = exports.EMAIL_SUBJECTS = exports.TEAM_A = exports.EMAIL_TEMPLATE_IDS = exports.FOCUS_BEAR_EMAILS = exports.STRIPE_API_VERSION = exports.USERNAME_VALIDATION_TIMEOUT = exports.TRIAL_DURATION_DAYS = exports.FALLBACK_MINIMUM_SCORE = exports.DYNAMIC_SCORE_ADJUSTMENT = exports.SECONDS_TO_MINUTES = exports.ROUTINE_COMPLETION_PERCENTAGE_THRESHOLD = exports.CURRENT_TIME = exports.TWENTY_FOUR_HOURS_AGO = exports.PostgresErrorCode = void 0;
exports.DEFAULT_THROTTLE_OPTIONS = exports.DEFAULT_ONBOARDING_DATA = exports.ACITIVITY_EMOJI_MAP = exports.FIFTEEN_MINUTES_IN_SECONDS = exports.MAX_COMMENT_ATTACHMENTS = exports.MAX_TASK_ATTACHMENTS = exports.MAX_ATTACHMENT_SIZE_BYTES = exports.S3_BUCKET_COMMENT_ATTACHMENTS = exports.S3_BUCKET_TASK_ATTACHMENTS = exports.S3_BUCKET_PROFILE_IMAGES = exports.S3_BUCKET_HABIT_IMPORTS = exports.S3_BUCKET_TODO_AUDIOS = exports.S3_BUCKET_TODO_IMAGES = exports.S3_BUCKET_USAGE_IMAGES = exports.DEFAULT_AI_RESPONSE_TIMEOUT_MS = exports.S3_BUCKET_EMOJIS = exports.S3_BUCKET_APP_USAGE_LOGS = exports.ONE_WEEK_IN_SECONDS = exports.FOCUS_ONLY_HABIT_PACK_ID = exports.DECIMAL_PRECISION = exports.DAYS_IN_MONTH = exports.DAYS_IN_WEEK = exports.createFocusModeFunction = exports.createActivityFunction = exports.BullWorkers = exports.BullQueues = exports.MAX_WEBHOOK_SUBSCRIPTIONS_PER_USER = exports.GPT_5_2 = exports.GPT_4_1 = exports.GPT_5_1 = exports.GPT_5_MINI = exports.GPT_4_1_MINI = exports.AUTH0_RETRY_CONFIG = exports.ACCOUNTABILITY_BUDDY = exports.MAX_RETRY = exports.FIELD_NAME_TOTAL = void 0;
const onboarding_flow_step_enum_1 = require("../../modules/user/domain/onboarding/onboarding-flow-step.enum");
const impact_category_enum_1 = require("../../modules/activity/domain/impact-category.enum");
const event_types_enum_1 = require("../../modules/events/domain/event-types.enum");
const onboarding_flow_feature_enum_1 = require("../../modules/user/domain/onboarding/onboarding-flow-feature.enum");
const routine_type_enum_1 = require("../../modules/user/domain/routine-type.enum");
const bearsona_profile_enum_1 = require("../../modules/user/domain/onboarding/bearsona-profile.enum");
const onboarding_flow_time_ui_enum_1 = require("../../modules/user/domain/onboarding/onboarding-flow-time-ui.enum");
var PostgresErrorCode;
(function (PostgresErrorCode) {
    PostgresErrorCode["UNIQUE_VIOLATION"] = "23505";
})(PostgresErrorCode || (exports.PostgresErrorCode = PostgresErrorCode = {}));
exports.TWENTY_FOUR_HOURS_AGO = new Date(Date.now() - 24 * 60 * 60 * 1000);
exports.CURRENT_TIME = new Date();
exports.ROUTINE_COMPLETION_PERCENTAGE_THRESHOLD = 10;
exports.SECONDS_TO_MINUTES = 60;
exports.DYNAMIC_SCORE_ADJUSTMENT = 0.05;
exports.FALLBACK_MINIMUM_SCORE = 0.5;
exports.TRIAL_DURATION_DAYS = 7;
exports.USERNAME_VALIDATION_TIMEOUT = 15000;
exports.STRIPE_API_VERSION = '2022-08-01';
exports.FOCUS_BEAR_EMAILS = {
    MARKETING: 'marketing@focusbear.io',
    SUPPORT: 'support@focusbear.io',
    ZOHO_DESK_SUPPORT: 'support@focusbear.zohodesk.com.au',
    NOREPLY: 'noreply@focusbear.io',
};
exports.EMAIL_TEMPLATE_IDS = {
    TEAM_INVITE: 'd-a920d24eac1948adab718cb3f62556f2',
    PROJECT_INVITE: 'd-a920d24eac1948adab718cb3f62556f2',
    VERIFY_EMAIL: 'd-d6cff2b375e54523b86061abebb8dbdf',
    REQUEST_PASSWORD_RESET: 'd-67cec7f121f04901814f6f41ec6e0122',
    ACCOUNTABILITY_BUDDY_INVITATION: 'd-ffddae2b9fb040a79244c8a871cce582',
    UNLOCK_REQUEST_RECEIVED: 'd-4b680eec43b84bf5b9f94bf2658ff738',
    UNLOCK_REQUEST_APPROVED: 'd-af80a1ec861a4da1989b8132b82c7b82',
};
exports.TEAM_A = 'Team A';
exports.EMAIL_SUBJECTS = {
    INACTIVE_ACCOUNT: 'Inactive Account',
    APP_QUIT_FEEDBACK: 'Focus Bear Feedback',
    USER_FEEDBACK_AND_APP_LOGS: 'User Feedback Add App Logs',
    USER_SURVEY_FEEDBACK: 'User Survey Feedback',
    USER_UNSUBSCRIBE_FEEDBACK: 'User Unsubscribe Feedback',
    USER_ACCOUNT_DELETE: 'User deleted account but gave permission to contact RE feedback',
    DUPLICATE_EMAIL_SIGN_UP: 'Duplicate EMail Sign Up',
};
exports.EMAIL_SENDER_NAME = 'Focus Bear';
exports.FEATURE_FLAGS = {
    WEEKLY_EMAILS: 'weekly_emails',
    DAILY_EMAILS: 'daily_emails',
    MONTHLY_EMAILS: 'monthly_emails',
};
exports.ONE_HOUR_SECONDS = 3600;
exports.ONE_HOUR_MILLISECONDS = 3600000;
exports.ONE_MINUTE = 60000;
exports.ONE_DAY_MILLISECONDS = exports.ONE_HOUR_MILLISECONDS * 24;
exports.ONE_MINUTE_SECONDS = 60;
exports.TEN_MINUTES = 600000;
exports.ONE_DAY_SECONDS = 86400;
exports.ONE_SECOND_AS_MILLIS = 1000;
exports.TWO_SECONDS_AS_MILLIS = 2000;
exports.TEN_SECONDS_AS_MILLIS = 10000;
exports.TWENTY = 20;
exports.TRIAL_COST_CENTS = 0;
exports.TRIAL_LENGTH_DAYS = 7;
exports.PERSONAL_PLAN_COST_CENTS = 500;
exports.USER_QUIT_TRACKING_DURATION_HOURS = 48;
exports.USER_QUIT_TRACKING_DURATION_MILLIS = exports.USER_QUIT_TRACKING_DURATION_HOURS * exports.ONE_HOUR_MILLISECONDS;
exports.DEFAULT_IANA_TIMEZONE = 'Etc/UTC';
exports.MONTH = 'month';
exports.USD = 'USD';
exports.TRIALING = 'trialing';
exports.ACTIVE = 'active';
exports.TRIAL = 'trial';
exports.CRON_JOB_TIMEOUT_MS = 10 * exports.ONE_MINUTE;
exports.UTC_TO_IANA_MAP = {
    '+00:00': 'Etc/UTC',
    '+01:00': 'Europe/London',
    '+02:00': 'Europe/Paris',
    '+03:00': 'Europe/Moscow',
    '+04:00': 'Asia/Dubai',
    '+05:00': 'Asia/Karachi',
    '+05:30': 'Asia/Kolkata',
    '+06:00': 'Asia/Dhaka',
    '+06:30': 'Indian/Cocos',
    '+07:00': 'Asia/Jakarta',
    '+08:00': 'Asia/Shanghai',
    '+08:45': 'Australia/Eucla',
    '+09:00': 'Asia/Tokyo',
    '+09:30': 'Australia/Adelaide',
    '+10:00': 'Australia/Sydney',
    '+10:30': 'Australia/Lord_Howe',
    '+11:00': 'Pacific/Noumea',
    '+12:00': 'Pacific/Fiji',
    '+12:45': 'Pacific/Chatham',
    '+13:00': 'Pacific/Tongatapu',
    '+14:00': 'Pacific/Kiritimati',
    '-01:00': 'Atlantic/Azores',
    '-02:00': 'America/Noronha',
    '-03:00': 'America/Sao_Paulo',
    '-04:00': 'America/New_York',
    '-05:00': 'America/Chicago',
    '-06:00': 'America/Denver',
    '-07:00': 'America/Los_Angeles',
    '-08:00': 'America/Anchorage',
    '-09:00': 'America/Adak',
    '-09:30': 'Pacific/Marquesas',
    '-10:00': 'Pacific/Honolulu',
    '-11:00': 'Pacific/Pago_Pago',
    '-12:00': 'Etc/UTC-12',
};
exports.JEREMYS_USER_ID = '9884b0af-dc9f-4207-964e-e4db537a2234';
const DEON_USER_ID = 'fb9c4498-cfc1-4342-8cb1-4cf026f59a72';
exports.IDS_TO_LOG_FOR = [exports.JEREMYS_USER_ID, DEON_USER_ID];
exports.DAYS_OF_WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
exports.EVENT_TYPES_TO_ALERT_IN_SLACK = [
    event_types_enum_1.EventTypes.APP_QUIT,
    event_types_enum_1.EventTypes.GIVE_ME_4HR_BREAK,
    event_types_enum_1.EventTypes.UNINSTALL,
    event_types_enum_1.EventTypes.BAD_AI_BLOCKING_DECISION,
];
exports.IMPACT_MEASUREMENT_EVENT_TYPES = [
    event_types_enum_1.EventTypes.UNLOCK_SUPER_DISTRACTING_WEBSITE,
    event_types_enum_1.EventTypes.POSTPONE_HABITS_FROM_MOBILE,
    event_types_enum_1.EventTypes.POSTPONE_FOCUS_MODE_FROM_MOBILE,
];
exports.DISTRACTION_BLOCK_EVENTS = [
    event_types_enum_1.EventTypes.BLOCK_DISTRACTING_APP,
    event_types_enum_1.EventTypes.BLOCK_DISTRACTING_URL,
    event_types_enum_1.EventTypes.BLOCK_DISTRACTION,
];
exports.EVENTS_TO_IMPACT_CATEGORIES_MAP = {
    [event_types_enum_1.EventTypes.POSTPONE_FOCUS_MODE_FROM_MOBILE]: impact_category_enum_1.ImpactCategory.MINUTES_SPENT_POSTPONING_APP_BLOCKS,
    [event_types_enum_1.EventTypes.POSTPONE_HABITS_FROM_MOBILE]: impact_category_enum_1.ImpactCategory.MINUTES_SPENT_POSTPONING_HABITS,
    [event_types_enum_1.EventTypes.UNLOCK_SUPER_DISTRACTING_WEBSITE]: impact_category_enum_1.ImpactCategory.MINUTES_SPENT_ON_DISTRACTING_WEBSITES,
};
exports.INTERNAL_TEST = 'internaltest';
exports.WORDS_TO_LOG_FOR = ['broken', 'annoying', 'dañado', 'molesto'];
exports.FIELD_NAME_WORKLOG = 'Worklog';
exports.FIELD_NAME_TOTAL = 'Total';
exports.MAX_RETRY = 2;
exports.ACCOUNTABILITY_BUDDY = {
    MAX_BUDDIES_PER_USER: 10,
    UNLOCK_REQUEST_COOLDOWN_HOURS: 1,
    INVITATION_EXPIRATION_DAYS: 1,
    UNLOCK_DURATION_MIN_MINUTES: 1,
    UNLOCK_DURATION_MAX_MINUTES: 1440,
    UNLOCK_REQUEST_REASON_MAX_LENGTH: 1000,
    UNLOCK_REQUEST_DEFAULT_REASON: 'No reason provided',
};
exports.AUTH0_RETRY_CONFIG = {
    MAX_RETRIES: 3,
    BASE_DELAY_MS: exports.TWO_SECONDS_AS_MILLIS,
};
exports.GPT_4_1_MINI = 'gpt-4.1-mini';
exports.GPT_5_MINI = 'gpt-5-mini';
exports.GPT_5_1 = 'gpt-5.1';
exports.GPT_4_1 = 'gpt-4.1';
exports.GPT_5_2 = 'gpt-5.2';
exports.MAX_WEBHOOK_SUBSCRIPTIONS_PER_USER = 10;
var BullQueues;
(function (BullQueues) {
    BullQueues["SYNC_EVENTS"] = "sync-events";
    BullQueues["REVENUE_CAT_STATUS"] = "revenue-cat-status";
    BullQueues["USER_DATA"] = "user-data";
    BullQueues["STATS"] = "stats";
    BullQueues["ACTIVITY_IMAGE"] = "activity-image";
    BullQueues["EVENTS"] = "events";
    BullQueues["TIME_LOGS"] = "time-logs";
    BullQueues["SYNC_TASKS"] = "sync-tasks";
    BullQueues["EMOJI_GENERATION"] = "emoji-generation";
    BullQueues["USAGE_IMAGE"] = "usage-image";
    BullQueues["HEALTH_METRICS_SYNC"] = "health-metrics-sync";
    BullQueues["USAGE_DATA"] = "usage-data";
    BullQueues["COMPLETED_ACTIVITY"] = "completed-activity";
    BullQueues["COMPLETED_ACTIVITY_DLQ"] = "completed-activity-dlq";
    BullQueues["TODO_IMAGE"] = "todo-image";
    BullQueues["TODO_AUDIO"] = "todo-audio";
    BullQueues["ROUTINE_SUGGESTIONS"] = "routine-suggestions";
    BullQueues["EMAIL_VERIFICATION"] = "email-verification";
    BullQueues["HABIT_IMPORT"] = "habit-import";
    BullQueues["WEBHOOK"] = "webhook";
    BullQueues["STRIPE_CUSTOMER"] = "stripe-customer";
    BullQueues["PASSWORD_RESET_EMAIL"] = "password-reset-email";
    BullQueues["SETTINGS_NOTIFICATION"] = "settings-notification";
})(BullQueues || (exports.BullQueues = BullQueues = {}));
var BullWorkers;
(function (BullWorkers) {
    BullWorkers["DAILY_STATS_ACTIVITY_COMPLETED"] = "daily-stats-activity-completed";
    BullWorkers["DELETE_ACTIVITY_IMAGE"] = "delete-activity-image";
    BullWorkers["SYNC_EVENTS_FOR_PLATFORM"] = "sync-events-for-platform";
    BullWorkers["TRACK_EVENT"] = "track-event";
    BullWorkers["SYNC_PROJECT_TASKS"] = "sync-project-tasks";
    BullWorkers["RESUME_NOTIFICATION"] = "resume-notification";
    BullWorkers["MANUALLY_SYNC_PLATFORM_TASKS"] = "manually-sync-platform-tasks";
    BullWorkers["CREATE_STRIPE_CUSTOMER"] = "create-stripe-customer";
    BullWorkers["SAVE_TASK_TIME_LOG"] = "save-task-time-log";
    BullWorkers["UPDATE_REVENUE_CAT_STATUS"] = "update-revenue-cat-status";
    BullWorkers["GET_USER_PERSONAL_DATA"] = "get-user-personal-data";
    BullWorkers["PROCESS_USAGE_IMAGE"] = "process-usage-image";
    BullWorkers["PROCESS_TODO_IMAGE"] = "process-todo-image";
    BullWorkers["PROCESS_TODO_AUDIO"] = "process-todo-audio";
    BullWorkers["SYNC_HEALTH_METRICS"] = "sync-health-metrics";
    BullWorkers["SYNC_USAGE_DATA"] = "sync-usage-data";
    BullWorkers["GENERATE_ACTIVITY_EMOJI"] = "generate-activity-emoji";
    BullWorkers["PROCESS_COMPLETED_ACTIVITY"] = "process-completed-activity";
    BullWorkers["PROCESS_ROUTINE_SUGGESTIONS"] = "process-routine-suggestions";
    BullWorkers["PROCESS_HABIT_CREATION"] = "process-habit-creation";
    BullWorkers["SEND_EMAIL_VERIFICATION"] = "send-email-verification";
    BullWorkers["PROCESS_HABIT_IMPORT"] = "process-habit-import";
    BullWorkers["SEND_WEBHOOK"] = "send-webhook";
    BullWorkers["SEND_PASSWORD_RESET_EMAIL"] = "send-password-reset-email";
    BullWorkers["SEND_SETTINGS_NOTIFICATION"] = "send-settings-notification";
})(BullWorkers || (exports.BullWorkers = BullWorkers = {}));
exports.createActivityFunction = {
    name: 'createActivity',
    description: 'Creates a new activity from users specifications of activity',
    parameters: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'Name of the activity, e.g. Reading',
            },
            duration: { type: 'number', description: 'Duration of the activity in seconds, e.g. 600' },
            routine: {
                type: 'string',
                enum: ['morning', 'break', 'evening'],
                description: 'The routine the activity will be part of.',
            },
            days_of_week: {
                type: 'array',
                items: { type: 'string', enum: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'ALL'] },
                description: 'The days of the week that the activity should be completed on.',
                default: ['ALL'],
            },
            allowed_urls: {
                type: 'array',
                title: 'allowed_urls',
                description: 'Allowed URLs to access during this focus mode',
                default: [],
                examples: [['https://www.youtube.com/watch?v=BWk_hqFGxfE', 'https://www.youtube.com/watch?v=W1I9M7g6VK8']],
                additionalItems: true,
                items: {
                    anyOf: [
                        {
                            type: 'string',
                            title: 'allowed_urls',
                            description: 'A URL that can be accessed during this focus mode.',
                            default: '',
                            examples: ['https://www.youtube.com/watch?v=BWk_hqFGxfE', 'https://www.youtube.com/watch?v=W1I9M7g6VK8'],
                        },
                    ],
                },
            },
            allowed_apps: {
                type: 'array',
                title: 'allowed_apps',
                description: 'Allowed apps to access during this focus mode',
                default: [],
                examples: [['Xcode', 'Safari']],
                additionalItems: true,
                items: {
                    anyOf: [
                        {
                            type: 'string',
                            title: 'app',
                            description: 'An app that can be accessed during this focus mode',
                            default: '',
                            examples: ['Xcode', 'Safari'],
                        },
                    ],
                },
            },
        },
        required: ['name', 'duration', 'routine'],
    },
};
exports.createFocusModeFunction = {
    name: 'createFocusMode',
    description: 'Creates a new focus mode with specified allowed apps and URLs if user asks to create a focus mode',
    parameters: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'Name of the focus mode, e.g. Coding Time',
                examples: ['COding Time', 'Marketing Work'],
            },
            allowed_urls: {
                type: 'array',
                title: 'allowed_urls',
                description: 'Allowed URLs to access during this focus mode',
                default: [],
                examples: [['https://www.youtube.com/watch?v=BWk_hqFGxfE', 'https://www.youtube.com/watch?v=W1I9M7g6VK8']],
                additionalItems: true,
                items: {
                    anyOf: [
                        {
                            type: 'string',
                            title: 'allowed_urls',
                            description: 'A URL that can be accessed during this focus mode.',
                            default: '',
                            examples: ['https://www.youtube.com/watch?v=BWk_hqFGxfE', 'https://www.youtube.com/watch?v=W1I9M7g6VK8'],
                        },
                    ],
                },
            },
            allowed_apps: {
                type: 'array',
                title: 'allowed_apps',
                description: 'Allowed apps to access during this focus mode',
                default: [],
                examples: [['Xcode', 'Safari']],
                additionalItems: true,
                items: {
                    anyOf: [
                        {
                            type: 'string',
                            title: 'app',
                            description: 'An app that can be accessed during this focus mode',
                            default: '',
                            examples: ['Xcode', 'Safari'],
                        },
                    ],
                },
            },
        },
        required: ['name', 'allowed_apps', 'allowed_urls'],
    },
};
exports.DAYS_IN_WEEK = 7;
exports.DAYS_IN_MONTH = 30;
exports.DECIMAL_PRECISION = 1;
exports.FOCUS_ONLY_HABIT_PACK_ID = '4a5872f5-a8e5-48c2-a2e3-83c3830fce58';
exports.ONE_WEEK_IN_SECONDS = 604800;
exports.S3_BUCKET_APP_USAGE_LOGS = 'app-usage-logs';
exports.S3_BUCKET_EMOJIS = 'emojis';
exports.DEFAULT_AI_RESPONSE_TIMEOUT_MS = 15000;
exports.S3_BUCKET_USAGE_IMAGES = 'activity-images';
exports.S3_BUCKET_TODO_IMAGES = 'todo-images';
exports.S3_BUCKET_TODO_AUDIOS = 'todo-audios';
exports.S3_BUCKET_HABIT_IMPORTS = 'habit-imports';
exports.S3_BUCKET_PROFILE_IMAGES = 'profile-images';
exports.S3_BUCKET_TASK_ATTACHMENTS = 'task-attachments';
exports.S3_BUCKET_COMMENT_ATTACHMENTS = 'comment-attachments';
exports.MAX_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024;
exports.MAX_TASK_ATTACHMENTS = 20;
exports.MAX_COMMENT_ATTACHMENTS = 5;
exports.FIFTEEN_MINUTES_IN_SECONDS = 900;
exports.ACITIVITY_EMOJI_MAP = {
    yoga: '🧘',
    meditation: '🧘',
    journaling: '📝',
    'deep-breathing': '',
    'drink-a-glass-of-water': '🥛',
    'work-environment-setup': '💻',
    'journal-about-day': '📝',
    exercise: '🏃',
    cooking: '🍳',
    cleaning: '🧹',
    organize: '📝',
    read: '📖',
    write: '📝',
    code: '💻',
    'evening-brain-dump': '🧠',
    'morning-walk': '🚶‍♂️',
    'workday-visualization': '📊',
    'productivity-playlist-setup': '🎵',
    'calendar-review': '📅',
    'priority-email-scan': '📧',
    'daily-work-intention': '✍️',
    'healthy-snack-planning': '🥗',
    'email-closure-routine': '📬',
    'goals-review-alignment': '🎯',
    'prepare-for-tomorrow': '🌅',
    'plan-to-do-list-and-schedule-for-tomorrow': '📅',
    abs: '💪',
    shower: '🚿',
    'get-ready-for-bed': '🛏️',
    stretch: '🤸‍♂️',
    meditate: '🧘',
    dips: '🤸‍♂️',
    plank: '🤸‍♂️',
    'push-ups': '🤸‍♂️',
    'pull-ups': '🤸‍♂️',
    'sit-ups': '🤸‍♂️',
    squats: '🤸‍♂️',
    lunges: '🤸‍♂️',
    'upper-body-twist': '🤸‍♂️',
    'office-exercises': '🤸‍♂️',
};
exports.DEFAULT_ONBOARDING_DATA = {
    currentStep: onboarding_flow_step_enum_1.OnboardFlowStep.DATA_PRIVACY,
    features: [onboarding_flow_feature_enum_1.OnboardFlowFeature.BUILD_HEALTHY_HABITS],
    routines: [routine_type_enum_1.RoutineType.MORNING_ROUTINE, routine_type_enum_1.RoutineType.EVENING_ROUTINE],
    profile: { name: bearsona_profile_enum_1.BearsonaProfile.OG, useProfileLang: true },
    activities: { morning_activities: [], evening_activities: [] },
    selectedGoals: [],
    times: {
        [onboarding_flow_time_ui_enum_1.OnboardFlowTimeUI.WAKE_UP]: '06:00',
        [onboarding_flow_time_ui_enum_1.OnboardFlowTimeUI.START_STUDY]: '08:00',
        [onboarding_flow_time_ui_enum_1.OnboardFlowTimeUI.FINISH_STUDY]: '17:30',
        [onboarding_flow_time_ui_enum_1.OnboardFlowTimeUI.GO_TO_SLEEP]: '21:00',
    },
    currentTimeUI: onboarding_flow_time_ui_enum_1.OnboardFlowTimeUI.WAKE_UP,
    break_after_minutes: 20,
    skippedSteps: [],
};
exports.DEFAULT_THROTTLE_OPTIONS = {
    ttl: 60,
    limit: 30,
};
//# sourceMappingURL=constants.js.map