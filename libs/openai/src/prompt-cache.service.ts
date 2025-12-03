/* eslint-disable no-console */
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import {
  PROMPT_CONFIG_PATH,
  APP_SAFETY_PROMPT_CONFIG_PATH,
  USAGE_SCREENSHOT_PROMPT_CONFIG_PATH,
  HABIT_ADJUSTMENT_PROMPT_CONFIG_PATH,
  HANDWRITTEN_TODOS_PROMPT_CONFIG_PATH,
  TODOS_TRANSCRIPT_PROMPT_CONFIG_PATH,
  ROUTINE_SUGGESTIONS_PROMPT_CONFIG_PATH,
  HABIT_IMPORT_IMAGE_PROMPT_CONFIG_PATH,
  HABIT_IMPORT_TRANSCRIPT_PROMPT_CONFIG_PATH,
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

      // Load habit adjustment prompts
      this.logger.log(`Loading habit adjustment prompts from ${HABIT_ADJUSTMENT_PROMPT_CONFIG_PATH}`);
      try {
        const habitAdjustmentContent = await fs.readFile(HABIT_ADJUSTMENT_PROMPT_CONFIG_PATH, 'utf8');
        const habitAdjustmentPrompts = yaml.load(habitAdjustmentContent) as {
          prompts: Array<{ id: string; raw: string }>;
        };
        allPrompts = allPrompts.concat(habitAdjustmentPrompts.prompts);
        this.logger.log(`Loaded ${habitAdjustmentPrompts.prompts.length} habit adjustment prompts`);
      } catch (error) {
        this.logger.error(`Failed to load habit adjustment prompts: ${error.message}`);
        this.sentryService.instance().captureException(error, {
          extra: {
            message: 'Failed to load habit adjustment prompts',
            configPath: HABIT_ADJUSTMENT_PROMPT_CONFIG_PATH,
          },
        });
      }

      // Load routine suggestions prompt
      this.logger.log(`Loading routine suggestions prompts from ${ROUTINE_SUGGESTIONS_PROMPT_CONFIG_PATH}`);
      try {
        const routineSuggestionsContent = await fs.readFile(ROUTINE_SUGGESTIONS_PROMPT_CONFIG_PATH, 'utf8');
        const routineSuggestionPrompts = yaml.load(routineSuggestionsContent) as {
          prompts: Array<{ id: string; raw: string }>;
        };
        if (routineSuggestionPrompts?.prompts?.length) {
          allPrompts = allPrompts.concat(routineSuggestionPrompts.prompts);
          this.logger.log(`Loaded ${routineSuggestionPrompts.prompts.length} routine suggestions prompts`);
        }
      } catch (error) {
        this.logger.error(`Failed to load routine suggestions prompts: ${error.message}`);
        this.sentryService.instance().captureException(error, {
          extra: {
            message: 'Failed to load routine suggestions prompts',
            configPath: ROUTINE_SUGGESTIONS_PROMPT_CONFIG_PATH,
          },
        });
      }

      // Load handwritten todos prompt (image flow) - prompt.json style (same as usage screenshot)
      this.logger.log(`Loading handwritten todos prompt from ${HANDWRITTEN_TODOS_PROMPT_CONFIG_PATH}`);
      try {
        const handwrittenTodosContent = await fs.readFile(HANDWRITTEN_TODOS_PROMPT_CONFIG_PATH, 'utf8');
        const handwrittenTodosPrompt = JSON.parse(handwrittenTodosContent);

        // Find the system message and concatenate all text blocks
        const systemMsg = handwrittenTodosPrompt.find((msg) => msg.role === 'system');
        const systemText = (systemMsg.content || [])
          .filter((block) => block.type === 'text' && block.text)
          .map((block) => block.text)
          .join('\n\n');

        if (!systemText) {
          throw new Error('handwritten todos prompt missing system text');
        }

        allPrompts.push({
          id: 'handwritten-todos-analysis',
          raw: systemText,
        });
        this.logger.log('Loaded handwritten todos prompt');
      } catch (error) {
        this.logger.error(`Failed to load handwritten todos prompt: ${error.message}`);
        this.sentryService.instance().captureException(error, {
          extra: {
            message: 'Failed to load handwritten todos prompt',
            configPath: HANDWRITTEN_TODOS_PROMPT_CONFIG_PATH,
          },
        });
      }
      // Load todos transcript prompt (audio flow) - prompt.json style (same as usage screenshot)
      this.logger.log(`Loading todos transcript prompt from ${TODOS_TRANSCRIPT_PROMPT_CONFIG_PATH}`);
      try {
        const todosTranscriptContent = await fs.readFile(TODOS_TRANSCRIPT_PROMPT_CONFIG_PATH, 'utf8');
        const todosTranscriptPrompt = JSON.parse(todosTranscriptContent)[0];
        allPrompts.push({
          id: 'todos-transcript-analysis',
          raw: todosTranscriptPrompt.content[0].text,
        });
        this.logger.log('Loaded todos transcript prompt');
      } catch (error) {
        this.logger.error(`Failed to load todos transcript prompt: ${error.message}`);
        this.sentryService.instance().captureException(error, {
          extra: {
            message: 'Failed to load todos transcript prompt',
            configPath: TODOS_TRANSCRIPT_PROMPT_CONFIG_PATH,
          },
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

      // Load habit import image prompts
      this.logger.log(`Loading habit import image prompts from ${HABIT_IMPORT_IMAGE_PROMPT_CONFIG_PATH}`);
      try {
        const habitImportImageContent = await fs.readFile(HABIT_IMPORT_IMAGE_PROMPT_CONFIG_PATH, 'utf8');
        const habitImportImagePrompts = yaml.load(habitImportImageContent) as {
          prompts: Array<{ id: string; raw: string }>;
        };
        if (habitImportImagePrompts?.prompts?.length) {
          allPrompts = allPrompts.concat(habitImportImagePrompts.prompts);
          this.logger.log(`Loaded ${habitImportImagePrompts.prompts.length} habit import image prompts`);
        }
      } catch (error) {
        this.logger.error(`Failed to load habit import image prompts: ${error.message}`);
        this.sentryService.instance().captureException(error, {
          extra: {
            message: 'Failed to load habit import image prompts',
            configPath: HABIT_IMPORT_IMAGE_PROMPT_CONFIG_PATH,
          },
        });
      }

      // Load habit import transcript prompts
      this.logger.log(
        `Loading habit import transcript prompts from ${HABIT_IMPORT_TRANSCRIPT_PROMPT_CONFIG_PATH}`,
      );
      try {
        const habitImportTranscriptContent = await fs.readFile(HABIT_IMPORT_TRANSCRIPT_PROMPT_CONFIG_PATH, 'utf8');
        const habitImportTranscriptPrompts = yaml.load(habitImportTranscriptContent) as {
          prompts: Array<{ id: string; raw: string }>;
        };
        if (habitImportTranscriptPrompts?.prompts?.length) {
          allPrompts = allPrompts.concat(habitImportTranscriptPrompts.prompts);
          this.logger.log(`Loaded ${habitImportTranscriptPrompts.prompts.length} habit import transcript prompts`);
        }
      } catch (error) {
        this.logger.error(`Failed to load habit import transcript prompts: ${error.message}`);
        this.sentryService.instance().captureException(error, {
          extra: {
            message: 'Failed to load habit import transcript prompts',
            configPath: HABIT_IMPORT_TRANSCRIPT_PROMPT_CONFIG_PATH,
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
