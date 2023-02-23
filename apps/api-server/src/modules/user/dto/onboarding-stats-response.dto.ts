export class OnboardingStatsResponseDto {
  level: number;

  total_percent: number;

  has_edited_settings: boolean;

  has_edited_always_blocked_urls: boolean;

  has_edited_focus_mode: boolean;

  has_installed_desktop_app: boolean;

  has_installed_mobile_app: boolean;

  morning_routine_completion_streak_days: number;

  evening_routine_completion_streak_days: number;

  focus_mode_completion_streak_days: number;

  morning_routines_completion_percentage_for_current_level: number;

  evening_routines_completion_percentage_for_current_level: number;

  focus_modes_completion_percentage_for_current_level: number;

  average_morning_routines_completion_percentage: number;

  average_evening_routines_completion_percentage: number;

  average_num_focus_modes_completed_per_day: number;
}
