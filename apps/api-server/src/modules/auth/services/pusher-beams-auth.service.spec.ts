import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { PusherBeamsService } from '@app/pusher-beams';
import { userDummy } from '../../../../test/dummies';
import { PusherBeamsAuthService } from './pusher-beams-auth.service';
import { PusherBeamsServiceMock, SentryServiceMock, UserRepositoryMock } from '../../../../test/mocks/index';
import { UserRepository } from '../../user/repositories/user.repository';

describe('PusherBeamsAuthService', () => {
  let pusherBeamsAuthService: PusherBeamsAuthService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PusherBeamsAuthService,
        PusherBeamsService,
        UserRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(PusherBeamsService)
      .useValue(PusherBeamsServiceMock)
      .compile();

    pusherBeamsAuthService = moduleRef.get<PusherBeamsAuthService>(PusherBeamsAuthService);
  });

  it('should be defined', () => {
    expect(pusherBeamsAuthService).toBeDefined();
  });

  describe('getBeamsToken', () => {
    it('positive: should return a beams token', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      PusherBeamsServiceMock.generateToken.mockResolvedValueOnce('someJwtString');
      const result = await pusherBeamsAuthService.getPusherBeamsToken(userDummy.id);

      expect(result).toBe('someJwtString');
    });
  });

  describe('unsubscribeFromBeams', () => {
    it('positive: deleteUser from PusherBeamsService should be called', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      await pusherBeamsAuthService.unsubscribeFromBeams(userDummy.id);

      expect(PusherBeamsServiceMock.deleteUser).toBeCalledWith(userDummy.id);
    });
  });
});
