import { Inject, Injectable } from '@nestjs/common';
import { InjectSentry, SentryService } from '@app/observability';
import { GoogleGenAI } from '@google/genai';
import { promises as fs } from 'fs';
import { IGeminiOptions } from './interfaces';
import { GEMINI_MODULE_OPTIONS, GEMINI_PARAMS, GEMINI_PROMPT_CONFIG_PATH } from './gemini.constants';

@Injectable()
export class GeminiService {
  private ai: GoogleGenAI;

  constructor(
    @Inject(GEMINI_MODULE_OPTIONS) private options: IGeminiOptions,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {
    this.ai = new GoogleGenAI({ apiKey: this.options.apiKey });
  }

  async processUsageImage(imageBuffer: string): Promise<
    Record<
      string,
      [
        {
          sourceName: string;
          minutesUsedTotal: number;
          category: string;
        },
      ]
    >
  > {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Processing usage image with Gemini API',
      });

      const prompt = await this.getPrompt();

      const response = await this.ai.models.generateContent({
        model: GEMINI_PARAMS.analyzeImage.model,
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: imageBuffer,
                },
              },
            ],
          },
        ],
        config: GEMINI_PARAMS.analyzeImage,
      });

      const content = response.text;

      // Remove code block markers if present
      const cleanedContent = content
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '');

      return JSON.parse(cleanedContent);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw new Error('Failed to process usage image with Gemini');
    }
  }

  private async getPrompt(): Promise<string> {
    try {
      const promptContent = await fs.readFile(GEMINI_PROMPT_CONFIG_PATH, 'utf8');
      const prompts = JSON.parse(promptContent);
      return prompts[0].content[0].text;
    } catch (error) {
      this.sentryService.instance().captureException(error, {
        extra: { message: 'Failed to load Gemini prompt', configPath: GEMINI_PROMPT_CONFIG_PATH },
      });
      throw new Error('Failed to load prompt configuration');
    }
  }

  async crossCheckWithGPT(
    imageBuffer: string,
    gptResult: Record<
      string,
      [
        {
          sourceName: string;
          minutesUsedTotal: number;
          category: string;
        },
      ]
    >,
  ): Promise<{
    geminiResult: Record<
      string,
      [
        {
          sourceName: string;
          minutesUsedTotal: number;
          category: string;
        },
      ]
    >;
    modelsAgree: boolean;
    disagreementDetails?: {
      gptResult: any;
      geminiResult: any;
      differences: string[];
    };
  }> {
    try {
      const geminiResult = await this.processUsageImage(imageBuffer);

      // Compare the results
      const modelsAgree = this.compareResults(gptResult, geminiResult);

      if (!modelsAgree) {
        const disagreementDetails = this.analyzeDisagreement(gptResult, geminiResult);

        // Log the disagreement for monitoring
        this.sentryService.instance().captureMessage('GPT and Gemini models disagree on image analysis', {
          level: 'warning',
          extra: {
            gptResult,
            geminiResult,
            disagreementDetails,
          },
        });

        return {
          geminiResult,
          modelsAgree: false,
          disagreementDetails,
        };
      }

      return {
        geminiResult,
        modelsAgree: true,
      };
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw new Error('Failed to cross-check results with Gemini');
    }
  }

  private compareResults(
    gptResult: Record<
      string,
      [
        {
          sourceName: string;
          minutesUsedTotal: number;
          category: string;
        },
      ]
    >,
    geminiResult: Record<
      string,
      [
        {
          sourceName: string;
          minutesUsedTotal: number;
          category: string;
        },
      ]
    >,
  ): boolean {
    // Convert to comparable format
    const gptApps = Object.keys(gptResult);
    const geminiApps = Object.keys(geminiResult);

    // Check if the same apps are detected
    if (gptApps.length !== geminiApps.length) {
      return false;
    }

    // Check if all apps are the same
    const allAppsMatch = gptApps.every((app) => geminiApps.includes(app));
    if (!allAppsMatch) {
      return false;
    }

    // Check if usage data is similar (allow for small differences)
    for (const app of gptApps) {
      const gptData = gptResult[app][0];
      const geminiData = geminiResult[app][0];

      // Compare source names
      if (gptData.sourceName !== geminiData.sourceName) {
        return false;
      }

      // Compare categories
      if (gptData.category !== geminiData.category) {
        return false;
      }

      // Compare usage time with tolerance (allow 5 minute difference)
      const timeDifference = Math.abs(gptData.minutesUsedTotal - geminiData.minutesUsedTotal);
      if (timeDifference > 5) {
        return false;
      }
    }

    return true;
  }

  private analyzeDisagreement(
    gptResult: Record<
      string,
      [
        {
          sourceName: string;
          minutesUsedTotal: number;
          category: string;
        },
      ]
    >,
    geminiResult: Record<
      string,
      [
        {
          sourceName: string;
          minutesUsedTotal: number;
          category: string;
        },
      ]
    >,
  ): {
    gptResult: any;
    geminiResult: any;
    differences: string[];
  } {
    const differences: string[] = [];
    const gptApps = Object.keys(gptResult);
    const geminiApps = Object.keys(geminiResult);

    // Check for different number of apps
    if (gptApps.length !== geminiApps.length) {
      differences.push(
        `Different number of apps detected: GPT found ${gptApps.length}, Gemini found ${geminiApps.length}`,
      );
    }

    // Check for missing apps
    const missingInGemini = gptApps.filter((app) => !geminiApps.includes(app));
    const missingInGPT = geminiApps.filter((app) => !gptApps.includes(app));

    if (missingInGemini.length > 0) {
      differences.push(`Apps detected by GPT but not Gemini: ${missingInGemini.join(', ')}`);
    }

    if (missingInGPT.length > 0) {
      differences.push(`Apps detected by Gemini but not GPT: ${missingInGPT.join(', ')}`);
    }

    // Check for differences in common apps
    const commonApps = gptApps.filter((app) => geminiApps.includes(app));
    for (const app of commonApps) {
      const gptData = gptResult[app][0];
      const geminiData = geminiResult[app][0];

      if (gptData.sourceName !== geminiData.sourceName) {
        differences.push(
          `${app}: Different source names - GPT: "${gptData.sourceName}", Gemini: "${geminiData.sourceName}"`,
        );
      }

      if (gptData.category !== geminiData.category) {
        differences.push(`${app}: Different categories - GPT: "${gptData.category}", Gemini: "${geminiData.category}"`);
      }

      const timeDifference = Math.abs(gptData.minutesUsedTotal - geminiData.minutesUsedTotal);
      if (timeDifference > 5) {
        differences.push(
          `${app}: Significant time difference - GPT: ${gptData.minutesUsedTotal}min, Gemini: ${geminiData.minutesUsedTotal}min`,
        );
      }
    }

    return {
      gptResult,
      geminiResult,
      differences,
    };
  }
}
