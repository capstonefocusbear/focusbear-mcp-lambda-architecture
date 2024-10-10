export class TasksStreaksResponse {
  constructor({
    morning_routines_streak,
    evening_routines_streak,
    focus_modes_streak,
    micro_breaks_streak,
  }: TasksStreaksResponse) {
    this.morning_routines_streak = morning_routines_streak;
    this.evening_routines_streak = evening_routines_streak;
    this.focus_modes_streak = focus_modes_streak;
    this.micro_breaks_streak = micro_breaks_streak;
  }

  focus_modes_streak: number;

  morning_routines_streak: number;

  evening_routines_streak: number;

  micro_breaks_streak: number;

  percent_morning_routines_streak_complete_in_90days?: number;

  percent_evening_routines_streak_complete_in_90days?: number;

  percent_micro_breaks_streak_complete_in_90days?: number;

  num_days_of_stats?: number;
}
