import { Module } from '@nestjs/common';
import { DynamicModuleFactory } from '../../dynamic-module/src';
import { IOpenAIOptions } from './interfaces';
import { OPENAI_MODULE_OPTIONS } from './openai.constants';
import { OpenAIService } from './openai.service';

@Module({
  providers: [OpenAIService],
  exports: [OpenAIService],
})
export class OpenAIModule extends DynamicModuleFactory<IOpenAIOptions>(OPENAI_MODULE_OPTIONS) {}
