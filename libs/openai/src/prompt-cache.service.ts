/* eslint-disable no-console */
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectSentry, SentryService } from '@app/observability';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import { join, dirname, resolve, normalize } from 'path';
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
  UNTRUSTED_USER_INPUT_PROMPT_CONFIG_PATH,
  MOTIVATIONAL_SUMMARY_PROMPT_CONFIG_PATH,
  CHAT_REPLY_PROMPT_CONFIG_PATH,
  TASK_SUGGESTION_URL_PROMPT_CONFIG_PATH,
  TASK_SUGGESTION_APP_PROMPT_CONFIG_PATH,
  USERNAME_VALIDATION_PROMPT_CONFIG_PATH,
  SUBTASKS_GENERATION_PROMPT_CONFIG_PATH,
  BRAIN_DUMP_CONVERSION_PROMPT_CONFIG_PATH,
  EMOJI_GENERATION_PROMPT_CONFIG_PATH,
  HABIT_INSTRUCTION_GENERATION_PROMPT_CONFIG_PATH,
  ROUTINE_SUGGESTIONS_GENERATE_PROMPT_CONFIG_PATH,
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

  /**
   * Read prompt files from source path first, then dist fallback path.
   * This supports both ts-node/dev and compiled runtime layouts.
   */
  private async readFileWithPathFallback(filePath: string): Promise<{ content: string; resolvedPath: string }> {
    const candidatePaths = [filePath];
    if (!filePath.startsWith('dist/') && !filePath.startsWith('/')) {
      candidatePaths.push(join('dist', filePath));
    }

    return this.tryReadCandidatePaths(candidatePaths, filePath, null);
  }

  private async tryReadCandidatePaths(
    candidatePaths: string[],
    requestedPath: string,
    lastError: NodeJS.ErrnoException | null,
  ): Promise<{ content: string; resolvedPath: string }> {
    if (candidatePaths.length === 0) {
      throw lastError ?? new Error(`Prompt file not found: ${requestedPath}`);
    }

    const [candidatePath, ...remainingPaths] = candidatePaths;
    try {
      const content = await fs.readFile(candidatePath, 'utf8');
      if (candidatePath !== requestedPath) {
        this.logger.log(`Resolved prompt path fallback from ${requestedPath} to ${candidatePath}`);
      }
      return { content, resolvedPath: candidatePath };
    } catch (error) {
      const typedError = error as NodeJS.ErrnoException;
      if (typedError.code !== 'ENOENT') {
        throw error;
      }
      return this.tryReadCandidatePaths(remainingPaths, requestedPath, typedError);
    }
  }

  /**
   * Resolves a file path relative to the config directory and validates
   * that the resolved path stays within the config directory (prevents path traversal).
   */
  private resolveAndValidatePath(filePath: string, configPath: string): string | null {
    // Reject paths with explicit parent directory references
    if (filePath.includes('..')) {
      return null;
    }

    const configDir = dirname(resolve(configPath));
    const fullPath = normalize(join(configDir, filePath));

    // Verify the resolved path is within the config directory
    if (!fullPath.startsWith(configDir)) {
      return null;
    }

    return fullPath;
  }

  // Helper method to load prompt content, handling both raw strings and file references
  private async loadPromptContent(
    prompt: { id: string; raw?: string; file?: string },
    configPath: string,
  ): Promise<string | null> {
    if (prompt.raw) {
      const rawValue = String(prompt.raw);
      const rawTrimmed = rawValue.trim();
      if (rawTrimmed.startsWith('file://')) {
        const filePath = rawTrimmed.replace('file://', '');
        const fullPath = this.resolveAndValidatePath(filePath, configPath);
        if (!fullPath) {
          this.logger.error(`Path traversal attempt detected in prompt ${prompt.id}: ${filePath}`);
          throw new Error('Invalid file path: path traversal not allowed');
        }
        try {
          const content = await fs.readFile(fullPath, 'utf8');
          return content;
        } catch (error) {
          this.logger.error(`Failed to load prompt file ${fullPath}: ${error.message}`);
          throw error;
        }
      }
      return rawValue;
    }
    if (prompt.file) {
      // Handle file:// protocol
      let filePath = prompt.file;
      if (filePath.startsWith('file://')) {
        filePath = filePath.replace('file://', '');
      }
      const fullPath = this.resolveAndValidatePath(filePath, configPath);
      if (!fullPath) {
        this.logger.error(`Path traversal attempt detected in prompt ${prompt.id}: ${filePath}`);
        throw new Error('Invalid file path: path traversal not allowed');
      }
      try {
        const content = await fs.readFile(fullPath, 'utf8');
        return content;
      } catch (error) {
        this.logger.error(`Failed to load prompt file ${fullPath}: ${error.message}`);
        throw error;
      }
    }
    return null;
  }

  private async loadPrompts() {
    try {
      let allPrompts: Array<{ id: string; raw: string }> = [];

      // Helper function to load prompts from YAML config
      const loadPromptsFromYaml = async (
        configPath: string,
        configName: string,
      ): Promise<Array<{ id: string; raw: string }>> => {
        try {
          this.logger.log(`Loading ${configName} prompts from ${configPath}`);
          const { content, resolvedPath } = await this.readFileWithPathFallback(configPath);
          const config = yaml.load(content) as {
            prompts: Array<{ id: string; raw?: string; file?: string }>;
          };
          if (!config?.prompts) {
            return [];
          }
          const loadedPrompts: Array<{ id: string; raw: string }> = await Promise.all(
            config.prompts.map(async (prompt) => {
              if (!prompt.id) {
                this.logger.error(`Skipping prompt without id in ${resolvedPath}`);
                this.sentryService.instance().captureMessage('Prompt config entry missing id', {
                  level: 'error',
                  extra: { configPath: resolvedPath, requestedConfigPath: configPath, prompt },
                });
                return null;
              }
              const promptContent = await this.loadPromptContent(prompt, resolvedPath);
              return promptContent ? { id: prompt.id, raw: promptContent } : null;
            }),
          );
          const validPrompts = loadedPrompts.filter((p): p is { id: string; raw: string } => p !== null);
          this.logger.log(`Loaded ${validPrompts.length} ${configName} prompts`);
          return validPrompts;
        } catch (error) {
          this.logger.error(`Failed to load ${configName} prompts: ${error.message}`);
          this.sentryService.instance().captureException(error, {
            extra: { message: `Failed to load ${configName} prompts`, configPath },
          });
          return [];
        }
      };

      // Load URL safety prompts
      allPrompts = allPrompts.concat(await loadPromptsFromYaml(PROMPT_CONFIG_PATH, 'URL safety'));

      // Load app safety prompts
      allPrompts = allPrompts.concat(await loadPromptsFromYaml(APP_SAFETY_PROMPT_CONFIG_PATH, 'app safety'));

      // Load habit adjustment prompts
      allPrompts = allPrompts.concat(
        await loadPromptsFromYaml(HABIT_ADJUSTMENT_PROMPT_CONFIG_PATH, 'habit adjustment'),
      );

      // Load routine suggestions prompt
      allPrompts = allPrompts.concat(
        await loadPromptsFromYaml(ROUTINE_SUGGESTIONS_PROMPT_CONFIG_PATH, 'routine suggestions'),
      );

      // Load routine suggestions generation prompt
      allPrompts = allPrompts.concat(
        await loadPromptsFromYaml(ROUTINE_SUGGESTIONS_GENERATE_PROMPT_CONFIG_PATH, 'routine suggestions generation'),
      );

      // Load new prompts from .md files
      allPrompts = allPrompts.concat(
        await loadPromptsFromYaml(UNTRUSTED_USER_INPUT_PROMPT_CONFIG_PATH, 'untrusted user input'),
      );
      allPrompts = allPrompts.concat(
        await loadPromptsFromYaml(MOTIVATIONAL_SUMMARY_PROMPT_CONFIG_PATH, 'motivational summary'),
      );
      allPrompts = allPrompts.concat(await loadPromptsFromYaml(CHAT_REPLY_PROMPT_CONFIG_PATH, 'chat reply'));
      allPrompts = allPrompts.concat(
        await loadPromptsFromYaml(TASK_SUGGESTION_URL_PROMPT_CONFIG_PATH, 'task suggestion URL'),
      );
      allPrompts = allPrompts.concat(
        await loadPromptsFromYaml(TASK_SUGGESTION_APP_PROMPT_CONFIG_PATH, 'task suggestion app'),
      );
      allPrompts = allPrompts.concat(
        await loadPromptsFromYaml(USERNAME_VALIDATION_PROMPT_CONFIG_PATH, 'username validation'),
      );
      allPrompts = allPrompts.concat(
        await loadPromptsFromYaml(SUBTASKS_GENERATION_PROMPT_CONFIG_PATH, 'subtasks generation'),
      );
      allPrompts = allPrompts.concat(
        await loadPromptsFromYaml(BRAIN_DUMP_CONVERSION_PROMPT_CONFIG_PATH, 'brain dump conversion'),
      );
      allPrompts = allPrompts.concat(
        await loadPromptsFromYaml(EMOJI_GENERATION_PROMPT_CONFIG_PATH, 'emoji generation'),
      );
      allPrompts = allPrompts.concat(
        await loadPromptsFromYaml(HABIT_INSTRUCTION_GENERATION_PROMPT_CONFIG_PATH, 'habit instruction generation'),
      );

      // Load handwritten todos prompt (image flow) - prompt.json style (same as usage screenshot)
      this.logger.log(`Loading handwritten todos prompt from ${HANDWRITTEN_TODOS_PROMPT_CONFIG_PATH}`);
      try {
        const { content: handwrittenTodosContent } = await this.readFileWithPathFallback(
          HANDWRITTEN_TODOS_PROMPT_CONFIG_PATH,
        );
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
        const { content: todosTranscriptContent } = await this.readFileWithPathFallback(
          TODOS_TRANSCRIPT_PROMPT_CONFIG_PATH,
        );
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
        const { content: usageScreenshotContent } = await this.readFileWithPathFallback(
          USAGE_SCREENSHOT_PROMPT_CONFIG_PATH,
        );
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
      allPrompts = allPrompts.concat(
        await loadPromptsFromYaml(HABIT_IMPORT_IMAGE_PROMPT_CONFIG_PATH, 'habit import image'),
      );

      // Load habit import transcript prompts
      allPrompts = allPrompts.concat(
        await loadPromptsFromYaml(HABIT_IMPORT_TRANSCRIPT_PROMPT_CONFIG_PATH, 'habit import transcript'),
      );

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
