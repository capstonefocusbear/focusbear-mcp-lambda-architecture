import { ImpactCategory } from '../../modules/activity/domain/impact-category.enum';
import { EventTypes } from '../../modules/events/domain/event-types.enum';

export const TWENTY_FOUR_HOURS_AGO = new Date(Date.now() - 24 * 60 * 60 * 1000);
export const CURRENT_TIME = new Date();
export const ROUTINE_COMPLETION_PERCENTAGE_THRESHOLD = 10;
export const TRIAL_DURATION_DAYS = 7;
export const USERNAME_VALIDATION_TIMEOUT = 15000;
export const STRIPE_API_VERSION = '2022-08-01';
export const FOCUS_BEAR_EMAILS = {
  MARKETING: 'marketing@focusbear.io',
  SUPPORT: 'support@focusbear.io',
  ZOHO_DESK_SUPPORT: 'support@focusbear.zohodesk.com.au',
};
export const EMAIL_TEMPLATE_IDS = {
  TEAM_INVITE: 'd-a920d24eac1948adab718cb3f62556f2',
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
export const ONE_HOUR_SECONDS = 3600;
export const ONE_HOUR_MILLISECONDS = 3600000;
export const ONE_MINUTE = 60000;
export const ONE_DAY_MILLISECONDS = ONE_HOUR_MILLISECONDS * 24;
export const ONE_MINUTE_SECONDS = 60;
export const TEN_MINUTES = 600000;
export const ONE_DAY_SECONDS = 86400;
export const ONE_SECOND_AS_MILLIS = 1000;
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

export const EVENT_TYPES_TO_ALERT_IN_SLACK = [EventTypes.APP_QUIT, EventTypes.GIVE_ME_4HR_BREAK, EventTypes.UNINSTALL];

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

export const GPT_4O = 'gpt-4o';
export const GPT_4O_MINI = 'gpt-4o-mini';

export enum BullQueues {
  SYNC_EVENTS = 'sync-events',
  REVENUE_CAT_STATUS = 'revenue-cat-status',
  USER_DATA = 'user-data',
  STATS = 'stats',
  ACTIVITY_IMAGE = 'activity-image',
  EVENTS = 'events',
  TIME_LOGS = 'time-logs',
  SYNC_TASKS = 'sync-tasks',
}

export enum BullWorkers {
  DAILY_STATS_ACTIVITY_COMPLETED = 'daily-stats-activity-completed',
  DELETE_ACTIVITY_IMAGE = 'delete-activity-image',
  SYNC_EVENTS_FOR_PLATFORM = 'sync-events-for-platform',
  TRACK_EVENT = 'track-event',
  SYNC_PROJECT_TASKS = 'sync-project-tasks',
  RESUME_NOTIFICATION = 'resume-notification',
  MANUALLY_SYNC_PLATFORM_TASKS = 'manually-sync-platform-tasks',
  SAVE_TASK_TIME_LOG = 'save-task-time-log',
  UPDATE_REVENUE_CAT_STATUS = 'update-revenue-cat-status',
  GET_USER_PERSONAL_DATA = 'get-user-personal-data',
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
export const DEFAULT_AI_RESPONSE_TIMEOUT_MS = 15000;
