import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { GEMINI_MODULE_OPTIONS } from './gemini.constants';

@Module({
  providers: [
    {
      provide: GEMINI_MODULE_OPTIONS,
      useValue: {
        apiKey: process.env.GEMINI_API_KEY,
      },
    },
    GeminiService,
  ],
  exports: [GeminiService],
})
export class GeminiModule {}
