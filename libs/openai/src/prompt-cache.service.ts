import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import { PROMPT_CONFIG_PATH } from './openai.constants';

@Injectable()
export class PromptCacheService implements OnModuleInit {
  private readonly logger = new Logger(PromptCacheService.name);

  private promptCache: { prompts: Array<{ id: string; raw: string }> } = { prompts: [] };

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
      this.logger.log(`Loading prompts from ${PROMPT_CONFIG_PATH}`);
      const fileContent = await fs.readFile(PROMPT_CONFIG_PATH, 'utf8');
      this.promptCache = yaml.load(fileContent) as { prompts: Array<{ id: string; raw: string }> };
      this.logger.log(`Loaded ${this.promptCache.prompts.length} prompts`);
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
