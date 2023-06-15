export const TWENTY_FOUR_HOURS_AGO = new Date(Date.now() - 24 * 60 * 60 * 1000);
export const CURRENT_TIME = new Date();
export const ROUTINE_COMPLETION_PERCENTAGE_THRESHOLD = 10;
export const FOCUS_BEAR_TEAM_EMAIL = 'team@focusbear.io';
export const USERNAME_VALIDATION_TIMEOUT = 15000;
export const ONE_MINUTE = 60000;
export const DEFAULT_IANA_TIMEZONE = 'Etc/UTC';

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
