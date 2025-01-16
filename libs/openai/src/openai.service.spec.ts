import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { SENTRY_TOKEN, SentryModule } from '@ntegral/nestjs-sentry';
import { I18nModule, I18nService, AcceptLanguageResolver, QueryResolver } from 'nestjs-i18n';
import * as path from 'path';
import { SentryServiceMock } from '../../../apps/api-server/test/mocks';
import { configsArray } from '../../../apps/api-server/src/config';
import { IOpenAIOptions } from './interfaces';
import { OPENAI_MODULE_OPTIONS } from './openai.constants';
import { OpenAIService } from './openai.service';

jest.mock('openai');

describe('OpenAIService', () => {
  let service: OpenAIService;
  let i18nService: I18nService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ load: configsArray }),
        SentryModule.forRoot({ dsn: '' }),
        I18nModule.forRoot({
          fallbackLanguage: 'en',
          loaderOptions: {
            path: path.join(__dirname, '/../../../apps/api-server/src/shared/i18n'),
            watch: true,
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
      ],
    }).compile();

    service = module.get<OpenAIService>(OpenAIService);
    i18nService = module.get<I18nService>(I18nService);
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
        reason: i18nService.t('common.ai_decision_fail', { lang: 'en' }),
      });
    });

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
        reason: i18nService.t('common.ai_decision_fail', { lang: 'es' }),
      });
    });
  });

  describe('addHttpsProtocol', () => {
    it('positive: should add https protocol to url', () => {
      const response = service.addHttpsProtocol('google.com');
      expect(response).toEqual('https://google.com');
    });
  });

  describe('addHttpsProtocolAndWWW', () => {
    it('positive: should add https protocol and www subdomain to url', () => {
      const response = service.addHttpsProtocolAndWWW('google.com');
      expect(response).toEqual('https://www.google.com');
    });
  });
});
