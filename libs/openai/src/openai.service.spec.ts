import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { SENTRY_TOKEN, SentryModule } from '@ntegral/nestjs-sentry';
import { SentryServiceMock } from '../../../apps/api-server/test/mocks';
import { configsArray } from '../../../apps/api-server/src/config';
import { IOpenAIOptions } from './interfaces';
import { OpenAIModule } from './openai.module';
import { OpenAIService } from './openai.service';

jest.mock('openai');

describe('OpenAIService', () => {
  let service: OpenAIService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
      imports: [
        ConfigModule.forRoot({ load: configsArray }),
        OpenAIModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService): IOpenAIOptions => configService.get('openai'),
        }),
        SentryModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: async (config: ConfigService) => config.get('sentry'),
        }),
      ],
    }).compile();

    service = module.get<OpenAIService>(OpenAIService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
