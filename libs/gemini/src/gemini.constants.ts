export const GEMINI_MODULE_OPTIONS = Symbol('GEMINI_MODULE_OPTIONS');

export const GEMINI_PARAMS = {
  default: {
    model: 'gemini-2.5-flash',
    temperature: 0,
  },
  analyzeImage: {
    model: 'gemini-2.5-pro',
    temperature: 0,
  },
};

export const GEMINI_PROMPT_CONFIG_PATH = 'apps/api-server/test/prompt-testing/usage-screenshot/prompt.json';
