import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { pusherBeamsPublishRequestFocusBlockDummy } from '../../../apps/api-server/test/dummies ';
import { configsArray } from '../../../apps/api-server/src/config';
import { IPusherBeamsOptions } from './interfaces';
import { PusherBeamsModule } from './pusher-beams.module';
import { PusherBeamsService } from './pusher-beams.service';
import { BeamsPublishRequest } from './domains/pusher-beams-publish-request.model';

jest.mock('@pusher/push-notifications-server');

describe('PusherBeamsService', () => {
  let service: PusherBeamsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ load: configsArray }),
        PusherBeamsModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService): IPusherBeamsOptions => configService.get('pusher-beams'),
        }),
      ],
    }).compile();

    service = module.get<PusherBeamsService>(PusherBeamsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBeamsPublishRequest', () => {
    it('should return a pusher beams publishRequest object', () => {
      const result = service.createBeamsPublishRequest(pusherBeamsPublishRequestFocusBlockDummy);
      expect(result).toBeInstanceOf(BeamsPublishRequest);
      expect(result).toMatchSnapshot();
    });
  });
});
