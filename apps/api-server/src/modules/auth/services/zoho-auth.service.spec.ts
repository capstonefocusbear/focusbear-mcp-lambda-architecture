import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SentryServiceMock, ZohoServiceMock } from '../../../../test/mocks';
import { UserRepositoryMock } from '../../../../test/mocks/repositories.mock';
import { UserRepository } from '../../user/repositories/user.repository';
import { ZohoAuthService } from './zoho-auth.service';
import { ZohoService } from '../../zoho/services/zoho.service';

describe('ZohoService', () => {
  let zohoAuthService: ZohoAuthService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ZohoAuthService,
        UserRepository,
        JwtService,
        ConfigService,
        ZohoService,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(ZohoService)
      .useValue(ZohoServiceMock)
      .compile();
    zohoAuthService = moduleRef.get<ZohoAuthService>(ZohoAuthService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('positive: should be defined', () => {
    expect(zohoAuthService).toBeDefined();
  });
});
