import { OnboardFlowStep } from '../../modules/user/domain/onboarding/onboarding-flow-step.enum';
import { ImpactCategory } from '../../modules/activity/domain/impact-category.enum';
import { EventTypes } from '../../modules/events/domain/event-types.enum';
import { OnboardFlowFeature } from '../../modules/user/domain/onboarding/onboarding-flow-feature.enum';
import { RoutineType } from '../../modules/user/domain/routine-type.enum';
import { BearsonaProfile } from '../../modules/user/domain/onboarding/bearsona-profile.enum';
import { OnboardFlowTimeUI } from '../../modules/user/domain/onboarding/onboarding-flow-time-ui.enum';

export const TWENTY_FOUR_HOURS_AGO = new Date(Date.now() - 24 * 60 * 60 * 1000);
export const CURRENT_TIME = new Date();
export const ROUTINE_COMPLETION_PERCENTAGE_THRESHOLD = 10;
export const SECONDS_TO_MINUTES = 60;
export const DYNAMIC_SCORE_ADJUSTMENT = 0.05;
export const FALLBACK_MINIMUM_SCORE = 0.5;
export const TRIAL_DURATION_DAYS = 7;
export const USERNAME_VALIDATION_TIMEOUT = 15000;
export const STRIPE_API_VERSION = '2022-08-01';
export const FOCUS_BEAR_EMAILS = {
  MARKETING: 'marketing@focusbear.io',
  SUPPORT: 'support@focusbear.io',
  ZOHO_DESK_SUPPORT: 'support@focusbear.zohodesk.com.au',
  NOREPLY: 'noreply@focusbear.io',
};
export const EMAIL_TEMPLATE_IDS = {
  TEAM_INVITE: 'd-a920d24eac1948adab718cb3f62556f2',
  VERIFY_EMAIL: 'd-d6cff2b375e54523b86061abebb8dbdf',
  REQUEST_PASSWORD_RESET: 'd-67cec7f121f04901814f6f41ec6e0122',
  ACCOUNTABILITY_BUDDY_INVITATION: 'd-ffddae2b9fb040a79244c8a871cce582',
  UNLOCK_REQUEST_RECEIVED: 'd-4b680eec43b84bf5b9f94bf2658ff738',
  UNLOCK_REQUEST_APPROVED: 'd-af80a1ec861a4da1989b8132b82c7b82',
};
export const TEAM_A = 'Team A';
export const EMAIL_SUBJECTS = {
  INACTIVE_ACCOUNT: 'Inactive Account',
  APP_QUIT_FEEDBACK: 'Focus Bear Feedback',
  USER_FEEDBACK_AND_APP_LOGS: 'User Feedback Add App Logs',
  USER_SURVEY_FEEDBACK: 'User Survey Feedback',
  USER_UNSUBSCRIBE_FEEDBACK: 'User Unsubscribe Feedback',
  USER_ACCOUNT_DELETE: 'User deleted account but gave permission to contact RE feedback',
  DUPLICATE_EMAIL_SIGN_UP: 'Duplicate EMail Sign Up',
};
export const EMAIL_SENDER_NAME = 'Focus Bear';
export const FEATURE_FLAGS = {
  WEEKLY_EMAILS: 'weekly_emails',
  DAILY_EMAILS: 'daily_emails',
  MONTHLY_EMAILS: 'monthly_emails',
} as const;
export const ONE_HOUR_SECONDS = 3600;
export const ONE_HOUR_MILLISECONDS = 3600000;
export const ONE_MINUTE = 60000;
export const ONE_DAY_MILLISECONDS = ONE_HOUR_MILLISECONDS * 24;
export const ONE_MINUTE_SECONDS = 60;
export const TEN_MINUTES = 600000;
export const ONE_DAY_SECONDS = 86400;
export const ONE_SECOND_AS_MILLIS = 1000;
export const TWO_SECONDS_AS_MILLIS = 2000;
export const TEN_SECONDS_AS_MILLIS = 10000;
export const TWENTY = 20;
export const TRIAL_COST_CENTS = 0;
export const TRIAL_LENGTH_DAYS = 7;
export const PERSONAL_PLAN_COST_CENTS = 500;
export const USER_QUIT_TRACKING_DURATION_HOURS = 48;
export const USER_QUIT_TRACKING_DURATION_MILLIS = USER_QUIT_TRACKING_DURATION_HOURS * ONE_HOUR_MILLISECONDS;
export const DEFAULT_IANA_TIMEZONE = 'Etc/UTC';
export const MONTH = 'month';
export const USD = 'USD';
export const TRIALING = 'trialing';
export const ACTIVE = 'active';
export const TRIAL = 'trial';
export const CRON_JOB_TIMEOUT_MS = 10 * ONE_MINUTE;
export const UTC_TO_IANA_MAP = {
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

export const JEREMYS_USER_ID = '9884b0af-dc9f-4207-964e-e4db537a2234';
const DEON_USER_ID = 'fb9c4498-cfc1-4342-8cb1-4cf026f59a72';
export const IDS_TO_LOG_FOR = [JEREMYS_USER_ID, DEON_USER_ID];

export const DAYS_OF_WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const EVENT_TYPES_TO_ALERT_IN_SLACK = [
  EventTypes.APP_QUIT,
  EventTypes.GIVE_ME_4HR_BREAK,
  EventTypes.UNINSTALL,
  EventTypes.BAD_AI_BLOCKING_DECISION,
];

export const IMPACT_MEASUREMENT_EVENT_TYPES = [
  EventTypes.UNLOCK_SUPER_DISTRACTING_WEBSITE,
  EventTypes.POSTPONE_HABITS_FROM_MOBILE,
  EventTypes.POSTPONE_FOCUS_MODE_FROM_MOBILE,
];

export const DISTRACTION_BLOCK_EVENTS = [
  EventTypes.BLOCK_DISTRACTING_APP,
  EventTypes.BLOCK_DISTRACTING_URL,
  EventTypes.BLOCK_DISTRACTION,
];

export const EVENTS_TO_IMPACT_CATEGORIES_MAP = {
  [EventTypes.POSTPONE_FOCUS_MODE_FROM_MOBILE]: ImpactCategory.MINUTES_SPENT_POSTPONING_APP_BLOCKS,
  [EventTypes.POSTPONE_HABITS_FROM_MOBILE]: ImpactCategory.MINUTES_SPENT_POSTPONING_HABITS,
  [EventTypes.UNLOCK_SUPER_DISTRACTING_WEBSITE]: ImpactCategory.MINUTES_SPENT_ON_DISTRACTING_WEBSITES,
};

export const INTERNAL_TEST = 'internaltest';

export const WORDS_TO_LOG_FOR = ['broken', 'annoying', 'dañado', 'molesto'];

export const FIELD_NAME_WORKLOG = 'Worklog';
export const FIELD_NAME_TOTAL = 'Total';
export const MAX_RETRY = 2;

export const ACCOUNTABILITY_BUDDY = {
  MAX_BUDDIES_PER_USER: 10,
  UNLOCK_REQUEST_COOLDOWN_HOURS: 1,
  INVITATION_EXPIRATION_DAYS: 1,
  UNLOCK_DURATION_MIN_MINUTES: 1,
  UNLOCK_DURATION_MAX_MINUTES: 1440, // 24 hours
  UNLOCK_REQUEST_REASON_MAX_LENGTH: 1000,
  UNLOCK_REQUEST_DEFAULT_REASON: 'No reason provided',
} as const;

export const AUTH0_RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY_MS: TWO_SECONDS_AS_MILLIS, // 2000ms for exponential backoff (2s, 4s, 6s)
} as const;

export const GPT_4_1_MINI = 'gpt-4.1-mini';
export const GPT_5_MINI = 'gpt-5-mini';
export const GPT_5_1 = 'gpt-5.1';
export const GPT_4_1 = 'gpt-4.1';
export const GPT_5_2 = 'gpt-5.2';

export const MAX_WEBHOOK_SUBSCRIPTIONS_PER_USER = 10;

export enum BullQueues {
  SYNC_EVENTS = 'sync-events',
  REVENUE_CAT_STATUS = 'revenue-cat-status',
  USER_DATA = 'user-data',
  STATS = 'stats',
  ACTIVITY_IMAGE = 'activity-image',
  EVENTS = 'events',
  TIME_LOGS = 'time-logs',
  SYNC_TASKS = 'sync-tasks',
  EMOJI_GENERATION = 'emoji-generation',
  USAGE_IMAGE = 'usage-image',
  HEALTH_METRICS_SYNC = 'health-metrics-sync',
  USAGE_DATA = 'usage-data',
  COMPLETED_ACTIVITY = 'completed-activity',
  COMPLETED_ACTIVITY_DLQ = 'completed-activity-dlq',
  TODO_IMAGE = 'todo-image',
  TODO_AUDIO = 'todo-audio',
  ROUTINE_SUGGESTIONS = 'routine-suggestions',
  EMAIL_VERIFICATION = 'email-verification',
  HABIT_IMPORT = 'habit-import',
  WEBHOOK = 'webhook',
  STRIPE_CUSTOMER = 'stripe-customer',
  PASSWORD_RESET_EMAIL = 'password-reset-email',
}

export enum BullWorkers {
  DAILY_STATS_ACTIVITY_COMPLETED = 'daily-stats-activity-completed',
  DELETE_ACTIVITY_IMAGE = 'delete-activity-image',
  SYNC_EVENTS_FOR_PLATFORM = 'sync-events-for-platform',
  TRACK_EVENT = 'track-event',
  SYNC_PROJECT_TASKS = 'sync-project-tasks',
  RESUME_NOTIFICATION = 'resume-notification',
  MANUALLY_SYNC_PLATFORM_TASKS = 'manually-sync-platform-tasks',
  CREATE_STRIPE_CUSTOMER = 'create-stripe-customer',
  SAVE_TASK_TIME_LOG = 'save-task-time-log',
  UPDATE_REVENUE_CAT_STATUS = 'update-revenue-cat-status',
  GET_USER_PERSONAL_DATA = 'get-user-personal-data',
  PROCESS_USAGE_IMAGE = 'process-usage-image',
  PROCESS_TODO_IMAGE = 'process-todo-image',
  PROCESS_TODO_AUDIO = 'process-todo-audio',
  SYNC_HEALTH_METRICS = 'sync-health-metrics',
  SYNC_USAGE_DATA = 'sync-usage-data',
  GENERATE_ACTIVITY_EMOJI = 'generate-activity-emoji',
  PROCESS_COMPLETED_ACTIVITY = 'process-completed-activity',
  PROCESS_ROUTINE_SUGGESTIONS = 'process-routine-suggestions',
  PROCESS_HABIT_CREATION = 'process-habit-creation',
  SEND_EMAIL_VERIFICATION = 'send-email-verification',
  PROCESS_HABIT_IMPORT = 'process-habit-import',
  SEND_WEBHOOK = 'send-webhook',
  SEND_PASSWORD_RESET_EMAIL = 'send-password-reset-email',
}

export const createActivityFunction = {
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

export const createFocusModeFunction = {
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

export const DAYS_IN_WEEK = 7;
export const DAYS_IN_MONTH = 30;
export const DECIMAL_PRECISION = 1;
export const FOCUS_ONLY_HABIT_PACK_ID = '4a5872f5-a8e5-48c2-a2e3-83c3830fce58';
export const ONE_WEEK_IN_SECONDS = 604800;
export const S3_BUCKET_APP_USAGE_LOGS = 'app-usage-logs';
export const S3_BUCKET_EMOJIS = 'emojis';
export const DEFAULT_AI_RESPONSE_TIMEOUT_MS = 15000;
export const S3_BUCKET_USAGE_IMAGES = 'activity-images';
export const S3_BUCKET_TODO_IMAGES = 'todo-images';
export const S3_BUCKET_TODO_AUDIOS = 'todo-audios';
export const S3_BUCKET_HABIT_IMPORTS = 'habit-imports';

export const ACITIVITY_EMOJI_MAP = {
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

export const DEFAULT_ONBOARDING_DATA = {
  currentStep: OnboardFlowStep.DATA_PRIVACY,
  features: [OnboardFlowFeature.BUILD_HEALTHY_HABITS],
  routines: [RoutineType.MORNING_ROUTINE, RoutineType.EVENING_ROUTINE],
  profile: { name: BearsonaProfile.OG, useProfileLang: true },
  activities: { morning_activities: [], evening_activities: [] },
  selectedGoals: [],
  times: {
    [OnboardFlowTimeUI.WAKE_UP]: '06:00',
    [OnboardFlowTimeUI.START_STUDY]: '08:00',
    [OnboardFlowTimeUI.FINISH_STUDY]: '17:30',
    [OnboardFlowTimeUI.GO_TO_SLEEP]: '21:00',
  },
  currentTimeUI: OnboardFlowTimeUI.WAKE_UP,
  break_after_minutes: 20,
  skippedSteps: [],
};

export const DEFAULT_THROTTLE_OPTIONS = {
  ttl: 60,
  limit: 30, // TODO: set an appropriate value based on request patterns from mobile and desktop apps
};
