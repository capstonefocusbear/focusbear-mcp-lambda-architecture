import { Test } from '@nestjs/testing';
import { PusherBeamsAuthService } from './pusher-beams-auth.service';
import { PusherBeamsAuthServiceMock, PusherBeamsServiceMock, UserRepositoryMock } from '../../../../test/mocks/index';
import { UserRepository } from '../../user/repositories/user.repository';
import { PusherBeamsService } from '../../../../../../libs/pusher-beams/src';

describe('PusherBeamsAuthService', () => {
  let pusherBeamsAuthService: PusherBeamsAuthService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PusherBeamsAuthService, PusherBeamsService, UserRepository],
    })
      .overrideProvider(PusherBeamsAuthService)
      .useValue(PusherBeamsAuthServiceMock)
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
});
