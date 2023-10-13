import { ImpactCategory } from '../../modules/activity/domain/impact-category.enum';
import { EventTypes } from '../../modules/events/domain/event-types.enum';

export const TWENTY_FOUR_HOURS_AGO = new Date(Date.now() - 24 * 60 * 60 * 1000);
export const CURRENT_TIME = new Date();
export const ROUTINE_COMPLETION_PERCENTAGE_THRESHOLD = 10;
export const FOCUS_BEAR_TEAM_EMAIL = 'team@focusbear.io';
export const USERNAME_VALIDATION_TIMEOUT = 15000;
export const STRIPE_API_VERSION = '2022-08-01';
export const FOCUS_BEAR_EMAILS = {
  TEAM: 'team@focusbear.io',
  MARKETING: 'marketing@focusbear.io',
};
export const EMAIL_SUBJECTS = {
  INACTIVE_ACCOUNT: 'Inactive Account',
};
export const ONE_HOUR_SECONDS = 3600;
export const ONE_MINUTE = 60000;
export const ONE_MINUTE_SECONDS = 60;
export const TEN_MINUTES = 600000;
export const ONE_SECOND_AS_MILLIS = 1000;
export const TEN_SECONDS_AS_MILLIS = 10000;
export const TWENTY = 20;
export const TRIAL_COST_CENTS = 0;
export const TRIAL_LENGTH_DAYS = 7;
export const PERSONAL_PLAN_COST_CENTS = 500;
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

export const DAYS_OF_WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const PROFITWELL_ADD_SUBSCRIPTION_ENDPOINT = 'https://api.profitwell.com/v2/subscriptions/';

export const EVENT_TYPES_TO_ALERT_IN_SLACK = [EventTypes.APP_QUIT, EventTypes.GIVE_ME_4HR_BREAK];

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
