import OpenAI from 'openai';
import { GPT_4O } from '../../../apps/api-server/src/shared/utils/constants';

export const OPENAI_MODULE_OPTIONS = Symbol('OPENAI_MODULE_OPTIONS');
export const MAX_WORD_LENGTH = { brainDump: 1000, intention: 500, default: 200, longTermGoal: 200, justification: 500 };
export const PROMPT_INJECTION_PATTERNS = {
  SYSTEM_OVERRIDE: /(\b(override|sudo|root)\b|(\bas\s+(admin|system))\b)/i,
  CODE_EXECUTION: /(\brun\b|\bexec(ute)?\b|\beval\b|\bscript\b)/i,
  DATA_THEFT: /(\b(password|SSN|API key|CVV)\b|(\b\d{3}-\d{2}-\d{4}\b))/i,
  ENCODING: /(base64:|%[0-9a-fA-F]{2}|\\x[0-9a-fA-F]{2})/i,
  JAILBREAK:
    /(\b(DAN|jailbreak|hypothetical|roleplay)\b|(what if|ignore (previous|prior))|(\/\*|\*\/|%%%\*\/)|(?=.*\bignore\b)(?=.*\binstructions?\b).+)/i,
};
export const INPUT_WRAPPER = '%%%';
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
