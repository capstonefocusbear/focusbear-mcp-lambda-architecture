import { registerAs } from '@nestjs/config';

export const openAiConfig = registerAs('openai', () => ({
  general: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  motivationalMessage: {
    apiKey: process.env.OPENAI_MOTIVATIONAL_API_KEY || process.env.OPENAI_API_KEY,
  },
  urlSafety: {
    apiKey: process.env.OPENAI_URL_SAFETY_API_KEY || process.env.OPENAI_API_KEY,
  },
  pushNotification: {
    apiKey: process.env.OPENAI_PUSH_API_KEY || process.env.OPENAI_API_KEY,
  },
  appSafety: {
    apiKey: process.env.OPENAI_APP_SAFETY_API_KEY || process.env.OPENAI_API_KEY,
  },
  usernameValidation: {
    apiKey: process.env.OPENAI_USERNAME_VALIDATION_API_KEY || process.env.OPENAI_API_KEY,
  },
  subtasksGeneration: {
    apiKey: process.env.OPENAI_SUBTASKS_GENERATION_API_KEY || process.env.OPENAI_API_KEY,
  },
  brainDumpConversion: {
    apiKey: process.env.OPENAI_BRAIN_DUMP_CONVERSION_API_KEY || process.env.OPENAI_API_KEY,
  },
  screenTimeImageOcr: {
    apiKey: process.env.OPENAI_SCREEN_TIME_IMAGE_OCR_API_KEY || process.env.OPENAI_API_KEY,
  },
  habitAdjustment: {
    apiKey: process.env.OPENAI_HABIT_ADJUSTMENT_API_KEY || process.env.OPENAI_API_KEY,
  },
  todosTranscriptAnalysis: {
    apiKey: process.env.OPENAI_TODOS_TRANSCRIPT_ANALYSIS_API_KEY || process.env.OPENAI_API_KEY,
  },
}));
