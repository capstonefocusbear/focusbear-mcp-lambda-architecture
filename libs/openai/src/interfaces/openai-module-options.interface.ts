import * as OpenAI from 'openai';

export type IOpenAIOptions = OpenAI.Configuration;

export interface HabitOption {
  name: string;
  streak_days: number;
}
