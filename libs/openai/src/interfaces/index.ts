export * from './openai-module-options.interface';

export interface AdjustedHabit {
  id: string;
  name: string;
  duration_seconds: number;
  tags?: string[];
}
export type AdjustedHabitsGrouped = Record<string, AdjustedHabit[]>;
export type AdjustHabitsWithAiResult = AdjustedHabit[] | AdjustedHabitsGrouped;
