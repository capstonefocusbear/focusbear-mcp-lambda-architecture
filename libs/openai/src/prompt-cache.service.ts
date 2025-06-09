/* eslint-disable no-console */
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import {
  PROMPT_CONFIG_PATH,
  APP_SAFETY_PROMPT_CONFIG_PATH,
  USAGE_SCREENSHOT_PROMPT_CONFIG_PATH,
} from './openai.constants';

@Injectable()
export class PromptCacheService implements OnModuleInit {
  private readonly logger = new Logger(PromptCacheService.name);

  private promptCache: {
    prompts: Array<{ id: string; raw: string }>;
  } = { prompts: [] };

  constructor(@InjectSentry() private readonly sentryService: SentryService) {}

  async onModuleInit() {
    await this.loadPrompts();
  }

  getPrompt(name: string): string | null {
    const prompt = this.promptCache.prompts.find((p) => p.id === name);
    return prompt ? prompt.raw : null;
  }

  // Return all cached prompts
  getAllPrompts() {
    return this.promptCache.prompts;
  }

  // Force reload prompts from disk
  async reloadPrompts() {
    await this.loadPrompts();
  }

  private async loadPrompts() {
    try {
      let allPrompts: Array<{ id: string; raw: string }> = [];

      // Load URL safety prompts
      this.logger.log(`Loading URL safety prompts from ${PROMPT_CONFIG_PATH}`);
      try {
        const urlSafetyContent = await fs.readFile(PROMPT_CONFIG_PATH, 'utf8');
        const urlSafetyPrompts = yaml.load(urlSafetyContent) as { prompts: Array<{ id: string; raw: string }> };
        allPrompts = allPrompts.concat(urlSafetyPrompts.prompts);
        this.logger.log(`Loaded ${urlSafetyPrompts.prompts.length} URL safety prompts`);
      } catch (error) {
        this.logger.error(`Failed to load URL safety prompts: ${error.message}`);
        this.sentryService.instance().captureException(error, {
          extra: { message: 'Failed to load URL safety prompts', configPath: PROMPT_CONFIG_PATH },
        });
      }

      // Load app safety prompts
      this.logger.log(`Loading app safety prompts from ${APP_SAFETY_PROMPT_CONFIG_PATH}`);
      try {
        const appSafetyContent = await fs.readFile(APP_SAFETY_PROMPT_CONFIG_PATH, 'utf8');
        const appSafetyPrompts = yaml.load(appSafetyContent) as { prompts: Array<{ id: string; raw: string }> };
        allPrompts = allPrompts.concat(appSafetyPrompts.prompts);
        this.logger.log(`Loaded ${appSafetyPrompts.prompts.length} app safety prompts`);
      } catch (error) {
        this.logger.error(`Failed to load app safety prompts: ${error.message}`);
        this.sentryService.instance().captureException(error, {
          extra: { message: 'Failed to load app safety prompts', configPath: APP_SAFETY_PROMPT_CONFIG_PATH },
        });
      }

      try {
        const usageScreenshotContent = await fs.readFile(USAGE_SCREENSHOT_PROMPT_CONFIG_PATH, 'utf8');
        const usageScreenshotPrompts = JSON.parse(usageScreenshotContent)[0];
        allPrompts.push({
          id: 'usage-screenshot-analysis',
          raw: usageScreenshotPrompts.content[0].text,
        });
      } catch (error) {
        this.logger.error(`Failed to load usage screenshot prompts: ${error.message}`);
        this.sentryService.instance().captureException(error, {
          extra: {
            message: 'Failed to load usage screenshot prompts',
            configPath: USAGE_SCREENSHOT_PROMPT_CONFIG_PATH,
          },
        });
      }

      this.promptCache = { prompts: allPrompts };
      this.logger.log(`Loaded ${this.promptCache.prompts.length} prompts in total`);
    } catch (error) {
      this.logger.error(`Failed to load prompts: ${error.message}`);
      this.sentryService.instance().captureException(error, {
        extra: { message: 'Failed to load prompts', configPath: PROMPT_CONFIG_PATH },
      });
      // Initialize with empty prompts
      this.promptCache = { prompts: [] };
    }
  }
}
