import OpenAI from 'openai';
import { GPT_4_1, GPT_4_1_MINI, GPT_5_MINI } from '../../../apps/api-server/src/shared/utils/constants';

export const OPENAI_MODULE_OPTIONS = Symbol('OPENAI_MODULE_OPTIONS');
export const TRANSLATION_KEYS = { AI_DECISION_FAIL: 'common.ai_decision_fail' };
export const TEST_CONSTANTS = {
  ZERO_PROBABILITY: 0,
  MOCK_ERROR_RESPONSE_PREFIX: 'AI decision failed for',
};
export const MAX_WORD_LENGTH = {
  brainDump: 1000,
  intention: 500,
  default: 200,
  longTermGoal: 200,
  justification: 500,
  metadata: 500,
};
export const INPUT_WRAPPER = '%%%';
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';

export enum OpenAIKeyType {
  GENERAL = 'general',
  MOTIVATIONAL_MESSAGE = 'motivationalMessage',
  URL_SAFETY = 'urlSafety',
  PUSH_NOTIFICATION = 'pushNotification',
  APP_SAFETY = 'appSafety',
  USERNAME_VALIDATION = 'usernameValidation',
  SUBTASKS_GENERATION = 'subtasksGeneration',
  BRAIN_DUMP_CONVERSION = 'brainDumpConversion',
  SCREEN_TIME_IMAGE_OCR = 'screenTimeImageOcr',
  ACTIVITY_EMOJI_GENERATION = 'activityEmojiGeneration',
  HABIT_ADJUSTMENT = 'habitAdjustment',
  TODOS_TRANSCRIPT_ANALYSIS = 'todosTranscriptAnalysis',
  ROUTINE_SUGGESTION_EMBEDDING = 'routineSuggestionEmbedding',
  ROUTINE_SUGGESTION = 'routineSuggestion',
}

export const APP_SAFETY_PROMPT_CONFIG_PATH = 'apps/api-server/test/prompt-testing/app-safety/config.yaml';
export const USAGE_SCREENSHOT_PROMPT_CONFIG_PATH =
  'apps/api-server/test/prompt-testing/usage-screenshot/openai-prompt.json';
export const PROMPT_CONFIG_PATH = 'apps/api-server/test/prompt-testing/url-safety/config.yaml';
export const HABIT_ADJUSTMENT_PROMPT_CONFIG_PATH = 'apps/api-server/test/prompt-testing/habit-adjustment/config.yaml';
export const HANDWRITTEN_TODOS_PROMPT_CONFIG_PATH =
  'apps/api-server/test/prompt-testing/handwritten-todos-analysis/prompt.json';
export const TODOS_TRANSCRIPT_PROMPT_CONFIG_PATH =
  'apps/api-server/test/prompt-testing/todos-transcript-analysis/prompt.json';
export const ROUTINE_SUGGESTIONS_PROMPT_CONFIG_PATH =
  'apps/api-server/test/prompt-testing/routine-suggestions/config.yaml';

export const PROMPT_INJECTION_PATTERNS = {
  // Critical patterns - these are almost always malicious
  CRITICAL: [
    /ignore\s+(all\s+)?(?:previous|prior)\s+instructions/i,
    /disregard\s+(all\s+)?(?:previous|prior)\s+instructions/i,
    /forget\s+(all\s+)?(?:previous|prior)\s+instructions/i,
    /\bDAN\b/i,
    /\bjailbreak\b/i,
    /\bhypothetical\s+scenario\s+where\s+you\s+ignore\b/i,
    /(?=.*\bignore\b)(?=.*\binstructions?\b)/i,
  ],

  // Suspicious patterns - potentially problematic but need more context
  SUSPICIOUS: [
    /\bsudo\s/i, // Add space after to avoid matching "sub"
    /\broot\s+access\b/i,
    /\boverride\s+system\b/i,
    /\bas\s+(an?\s+)?(admin|system)\b/i,
    /\bexec(ute)?\s+code\b/i,
    /\beval\s+/i,
    /\bwhat\s+if\s+you\s+ignored\b/i,
  ],

  // Context-specific patterns - different treatment based on context
  CONTEXT_SPECIFIC: {
    ALWAYS_CHECK: [
      // Encoding patterns
      /base64:/i,
      /%[0-9a-fA-F]{2}/,
      /\\x[0-9a-fA-F]{2}/,
    ],

    // Common in website contexts but suspicious elsewhere
    COMMON_IN_WEBSITES: [
      /\breset\s+password\b/i,
      /\blogin\b/i,
      /\bsign\s+in\b/i,
      /\bcreate\s+account\b/i,
      /\bCSS\s+override\b/i,
      /\bstyle\s+override\b/i,
    ],
  },
};

export const OPENAI_PARAMS: Record<string, OpenAI.Chat.Completions.ChatCompletionCreateParams> = {
  default: {
    model: GPT_4_1_MINI,
    n: 1,
    messages: null,
    response_format: { type: 'json_object' },
  },
  activityEmojiGeneration: {
    model: GPT_4_1_MINI,
    temperature: 0,
    n: 1,
    messages: null,
  },
  convertBrainDumpToTasks: {
    model: GPT_5_MINI,
    temperature: 0,
    n: 1,
    messages: null,
  },

  createSubtasks: {
    model: GPT_4_1_MINI,
    temperature: 0,
    n: 1,
    messages: null,
  },

  checkUserName: {
    model: GPT_4_1_MINI,
    temperature: 0,
    n: 1,
    messages: null,
  },
  checkURL: {
    model: GPT_4_1_MINI,
    n: 1,
    messages: null,
    response_format: { type: 'json_object' },
  },

  chatReply: {
    model: GPT_4_1_MINI,
    temperature: 0.7,
    n: 1,
    stream: true,
    messages: null,
  },

  createMotivation: {
    model: GPT_4_1_MINI,
    temperature: 1,
    n: 1,
    messages: null,
    stream: true,
  },

  analyzeImage: {
    model: GPT_4_1,
    prompt_cache_retention: '24h',

    messages: null,
  },

  habitAdjustment: {
    model: GPT_4_1,
    prompt_cache_retention: '24h',
    temperature: 0,
    n: 1,
    max_tokens: 1024,
    messages: null,
  },

  todosTranscriptAnalysis: {
    model: GPT_4_1,
    temperature: 0,
    n: 1,
    messages: null,
    response_format: { type: 'json_object' },
  },
  routineSuggestions: {
    model: GPT_5_MINI,
    temperature: 1,
    n: 1,
    messages: null,
  },
};
