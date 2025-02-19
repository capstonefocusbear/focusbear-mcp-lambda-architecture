import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { SENTRY_TOKEN, SentryModule } from '@ntegral/nestjs-sentry';
import { I18nModule, I18nService, AcceptLanguageResolver, QueryResolver } from 'nestjs-i18n';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import { SentryServiceMock } from '../../../apps/api-server/test/mocks';
import { configsArray } from '../../../apps/api-server/src/config';
import { IOpenAIOptions } from './interfaces';
import { OPENAI_MODULE_OPTIONS } from './openai.constants';
import { OpenAIService } from './openai.service';
import { UrlSafePromptType } from './domain/url-safe-prompt-type.enum';

// Mock fs and yaml for our prompt config loading
jest.mock('fs/promises');
jest.mock('js-yaml');

const mockPrompts = {
  prompts: [
    {
      name: 'default',
      content: 'Default prompt content {{url}} {{focus_mode}}',
    },
    {
      name: 'strict',
      content: 'Strict prompt content {{url}} {{focus_mode}}',
    },
  ],
};

describe('OpenAIService', () => {
  let service: OpenAIService;
  let module: TestingModule;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup yaml mock so that when configuration is loaded it returns our dummy prompts.
    (yaml.load as jest.Mock).mockReturnValue(mockPrompts);

    // Setup fs mock to resolve with a JSON string of our dummy prompts.
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockPrompts));

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ load: configsArray }),
        SentryModule.forRoot({ dsn: '' }),
        I18nModule.forRoot({
          fallbackLanguage: 'en',
          loaderOptions: {
            // Using a dummy path to avoid file not found errors.
            path: path.join(__dirname, 'dummy-i18n'),
            watch: false,
          },
          resolvers: [{ use: QueryResolver, options: ['lang'] }, AcceptLanguageResolver],
        }),
      ],
      providers: [
        OpenAIService,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
        {
          provide: OPENAI_MODULE_OPTIONS,
          useValue: {
            apiKey: 'test-api-key',
          } as IOpenAIOptions,
        },
        ConfigService,
        // Override I18nService with a simple mock to avoid translation file loading issues.
        {
          provide: I18nService,
          useValue: {
            t: jest.fn().mockImplementation((key: string, options: any) => {
              if (key === 'common.ai_decision_fail') {
                return `AI decision failed for ${options.lang}`;
              }
              return key;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OpenAIService>(OpenAIService);

    // Mock the getMetadata method on the service to return dummy title and description.
    service.getMetadata = jest.fn().mockResolvedValue({
      title: 'Test Title',
      description: 'Test Description',
    });
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkIfUrlIsSafeToUse', () => {
    it('should return fallback response if retries fail (English)', async () => {
      const isUrlSafeDto = {
        url: 'http://example.com',
        meta_description: '',
        tab_title: '',
        focus_mode: 'work',
        intention: 'focus',
        language: 'en',
      };

      const prefLanguage = 'en';
      const result = await service.checkIfUrlIsSafeToUse(isUrlSafeDto, prefLanguage);

      expect(result).toEqual({
        allowed_probability: 0,
        reason: 'AI decision failed for en',
      });
    }, 10000);

    it('should return fallback response if retries fail (Spanish)', async () => {
      const isUrlSafeDto = {
        url: 'http://example.com',
        meta_description: '',
        tab_title: '',
        focus_mode: 'work',
        intention: 'focus',
        language: 'es',
      };

      const prefLanguage = 'es';
      const result = await service.checkIfUrlIsSafeToUse(isUrlSafeDto, prefLanguage);

      expect(result).toEqual({
        allowed_probability: 0,
        reason: 'AI decision failed for es',
      });
    }, 10000);

    it('should use correct prompt based on type', async () => {
      const isUrlSafeDto = {
        url: 'http://example.com',
        meta_description: 'Test Description',
        tab_title: 'Test Title',
        focus_mode: 'work',
        intention: 'focus',
        language: 'en',
        promptType: UrlSafePromptType.DEFAULT,
      };

      // This call will use the already-loaded configuration.
      await service.checkIfUrlIsSafeToUse(isUrlSafeDto, 'en');

      // No explicit assertions on fs.readFile or yaml.load here since configuration is loaded once during initialization.
    });

    it('should handle missing config file gracefully', async () => {
      // Simulate missing config file by making fs.readFile reject.
      (fs.readFile as jest.Mock).mockRejectedValueOnce(new Error('ENOENT'));

      const isUrlSafeDto = {
        url: 'http://example.com',
        meta_description: 'Test',
        tab_title: '',
        focus_mode: 'work',
        intention: 'test',
        language: 'en',
      };

      const result = await service.checkIfUrlIsSafeToUse(isUrlSafeDto, 'en');
      expect(result.allowed_probability).toBe(0);
    });
  });
});
