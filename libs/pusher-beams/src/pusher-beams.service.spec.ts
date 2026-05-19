import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { pusherBeamsPublishRequestFocusBlockDummy } from '../../../apps/api-server/test/dummies';
import { configsArray } from '../../config/src';
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
      const dummyTitle = 'New Notification';
      const dummyBody = 'You have recevied a notification.';
      const result = service.createBeamsPublishRequest({
        title: dummyTitle,
        body: dummyBody,
        pushData: pusherBeamsPublishRequestFocusBlockDummy,
      });
      expect(result).toBeInstanceOf(BeamsPublishRequest);
      expect(result).toMatchSnapshot();
    });
  });
});
