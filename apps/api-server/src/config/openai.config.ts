import { IOpenAIOptions } from '@app/openai';
import { registerAs } from '@nestjs/config';

export const openAiConfig = registerAs(
  'openai',
  (): IOpenAIOptions => ({
    apiKey: process.env.OPENAI_API_KEY,
  }),
);
