import { Module } from '@nestjs/common';
import { DynamicModuleFactory } from '../../dynamic-module/src';
import { IOpenAIOptions } from './interfaces';
import { OPENAI_MODULE_OPTIONS } from './openai.constants';
import { OpenAIService } from './openai.service';
import { PromptCacheService } from './prompt-cache.service';

@Module({
  providers: [OpenAIService, PromptCacheService],
  exports: [OpenAIService, PromptCacheService],
})
export class OpenAIModule extends DynamicModuleFactory<IOpenAIOptions>(OPENAI_MODULE_OPTIONS) {}
