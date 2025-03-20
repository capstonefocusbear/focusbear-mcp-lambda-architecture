import * as OpenAI from 'openai';

export interface IOpenAIOptions {
  general?: OpenAI.ClientOptions;
  motivationalMessage?: OpenAI.ClientOptions;
  urlSafety?: OpenAI.ClientOptions;
  pushNotification?: OpenAI.ClientOptions;
  usernameValidation?: OpenAI.ClientOptions;
  subtasksGeneration?: OpenAI.ClientOptions;
  brainDumpConversion?: OpenAI.ClientOptions;
  // Backward compatibility
  apiKey?: string;
}

export interface HabitOption {
  name: string;
  streak_days: number;
}
