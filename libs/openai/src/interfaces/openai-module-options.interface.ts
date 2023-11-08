import * as OpenAI from 'openai';

export type IOpenAIOptions = OpenAI.ClientOptions;

export interface HabitOption {
  name: string;
  streak_days: number;
}
