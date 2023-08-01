import { DaysOfWeek } from '../../apps/api-server/src/modules/activity/domain/days-of-week.enum';

export const BASE_ONBOARDING_PROGRESS = {
  level: 1,
  has_edited_focus_mode: false,
  has_edited_settings: false,
  has_edited_always_blocked_urls: false,
  has_installed_desktop_app: false,
  has_installed_mobile_app: false,
  has_chatted_with_focus_bear: false,
};

export const LUXON_WEEK_DAYS = [1, 2, 3, 4, 5];

export const LEVEL_THRESHOLDS = [
  {
    level: 1,
    routines: 7,
    focus_modes: 10,
  },
  {
    level: 2,
    routines: 14,
    focus_modes: 20,
  },
  {
    level: 3,
    routines: 21,
    focus_modes: 30,
  },
];

export const DAYS_OF_WEEK = [
  DaysOfWeek.MON,
  DaysOfWeek.TUE,
  DaysOfWeek.WED,
  DaysOfWeek.THU,
  DaysOfWeek.FRI,
  DaysOfWeek.SAT,
  DaysOfWeek.SUN,
];
