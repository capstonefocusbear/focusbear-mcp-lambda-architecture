import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { configsArray } from '../../../apps/api-server/src/config';
import { IPusherOptions } from './interfaces';
import { PusherModule } from './pusher.module';
import { PusherService } from './pusher.service';

describe('PusherService', () => {
  let service: PusherService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ load: configsArray }),
        PusherModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService): IPusherOptions => configService.get('pusher'),
        }),
      ],
    }).compile();

    service = module.get<PusherService>(PusherService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
