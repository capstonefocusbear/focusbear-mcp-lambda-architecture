import OpenAI from 'openai';
import { GPT_4O } from '../../../apps/api-server/src/shared/utils/constants';

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

export enum OpenAIKeyType {
  GENERAL = 'general',
  MOTIVATIONAL_MESSAGE = 'motivationalMessage',
  URL_SAFETY = 'urlSafety',
  PUSH_NOTIFICATION = 'pushNotification',
  USERNAME_VALIDATION = 'usernameValidation',
  SUBTASKS_GENERATION = 'subtasksGeneration',
  BRAIN_DUMP_CONVERSION = 'brainDumpConversion',
}

export const PROMPT_CONFIG_PATH = 'apps/api-server/test/prompt-testing/url-safety/config.yaml';
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
    model: GPT_4O,
    temperature: 0,
    n: 1,
    messages: null,
  },
  convertBrainDumpToTasks: {
    model: GPT_4O,
    temperature: 0,
    n: 1,
    messages: null,
  },

  createSubtasks: {
    model: GPT_4O,
    temperature: 0,
    n: 1,
    messages: null,
  },

  checkUserName: {
    model: GPT_4O,
    temperature: 0,
    n: 1,
    messages: null,
  },
  checkURL: {
    model: GPT_4O,
    temperature: 0,
    n: 1,
    messages: null,
  },

  chatReply: {
    model: GPT_4O,
    temperature: 0.7,
    n: 1,
    stream: true,
    messages: null,
  },

  createMotivation: {
    model: GPT_4O,
    temperature: 0.7,
    n: 1,
    messages: null,
    stream: true,
  },
};
