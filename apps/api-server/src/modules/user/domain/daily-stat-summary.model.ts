export class DailyStatSummary {
  constructor({
    date,
    day_of_week,
    morning_percentage = 0,
    evening_percentage = 0,
    micro_breaks_completion_percentage = 0,
    focus_modes = 0,
    morning_minutes,
    morning_total_minutes = 0,
    evening_minutes,
    evening_total_minutes = 0,
    micro_breaks_minutes,
    micro_breaks_total_minutes = 0,
  }: DailyStatSummary) {
    this.date = date;
    this.day_of_week = day_of_week;
    this.morning_percentage = morning_percentage;
    this.evening_percentage = evening_percentage;
    this.micro_breaks_completion_percentage = micro_breaks_completion_percentage;
    this.focus_modes = focus_modes;
    this.morning_minutes = morning_minutes;
    this.morning_total_minutes = morning_total_minutes;
    this.evening_minutes = evening_minutes;
    this.evening_total_minutes = evening_total_minutes;
    this.micro_breaks_minutes = micro_breaks_minutes;
    this.micro_breaks_total_minutes = micro_breaks_total_minutes;
  }

  date: Date;

  day_of_week: string;

  morning_percentage?: number;

  evening_percentage?: number;

  micro_breaks_completion_percentage?: number;

  focus_modes?: number;

  morning_minutes?: number;

  morning_total_minutes: number;

  evening_minutes?: number;

  evening_total_minutes: number;

  micro_breaks_minutes?: number;

  micro_breaks_total_minutes: number;
}
