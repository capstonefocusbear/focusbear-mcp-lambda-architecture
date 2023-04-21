import { registerAs } from '@nestjs/config';
import { Configuration } from 'openai';

export const openAiConfig = registerAs(
  'openai',
  (): Configuration => ({
    apiKey: process.env.OPENAI_API_KEY,
    isJsonMime: () => false,
  }),
);
