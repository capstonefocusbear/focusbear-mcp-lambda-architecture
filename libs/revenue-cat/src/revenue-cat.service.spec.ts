import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { configsArray } from '../../../apps/api-server/src/config';
import { IRevenueCatOptions } from './interfaces';
import { RevenueCatModule } from './revenue-cat.module';
import { RevenueCatService } from './revenue-cat.service';

describe('RevenueCatService', () => {
  let service: RevenueCatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ load: configsArray }),
        RevenueCatModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService): IRevenueCatOptions => ({
            ...configService.get('revenueCatConfig'),
            secretApiKey: '',
            publicApiKey: '',
          }),
        }),
      ],
    }).compile();

    service = module.get<RevenueCatService>(RevenueCatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
