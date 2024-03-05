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
    routines: 1,
    focus_modes: 1,
  },
  {
    level: 2,
    routines: 2,
    focus_modes: 2,
  },
  {
    level: 3,
    routines: 5,
    focus_modes: 5,
  },
  {
    level: 4,
    routines: 7,
    focus_modes: 10,
  },
  {
    level: 5,
    routines: 10,
    focus_modes: 15,
  },
  {
    level: 6,
    routines: 15,
    focus_modes: 30,
  },
  {
    level: 7,
    routines: 30,
    focus_modes: 50,
  },
  {
    level: 8,
    routines: 60,
    focus_modes: 100,
  },
  {
    level: 9,
    routines: 100,
    focus_modes: 200,
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
