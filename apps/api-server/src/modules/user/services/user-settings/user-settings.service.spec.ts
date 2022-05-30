import { Test } from '@nestjs/testing';
import { ActivityParserServiceMock, UserRepositoryMock } from '../../../../../test/mocks';
import { ActivityParserService } from '../../../activity/services/activity-parser/activity-parser.service';
import { UserRepository } from '../../repositories/user.repository';
import { UserSettingsService } from './user-settings.service';

describe('UserSettingsService', () => {
  let userSettingsService: UserSettingsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [UserRepository, UserSettingsService, ActivityParserService],
    })
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(ActivityParserService)
      .useValue(ActivityParserServiceMock)
      .compile();

    userSettingsService = moduleRef.get<UserSettingsService>(UserSettingsService);
  });

  it('should be defined', () => {
    expect(userSettingsService).toBeDefined();
  });

  // describe('authenticate', () => {

  //   it('positive: should return an authorized Passport instance', async () => {
  //     UserRepositoryMock.validateAccessToken.mockResolvedValueOnce([true, { payload }]);

  //     const result = await UserSettingsService.authenticate(headers);

  //     expect(result).toBeInstanceOf(Passport);
  //     expect(result.isAuth).toBeTrue();
  //     expect(result.declineReason).toBeNull();
  //   });

  //   it('negative: should return an unauthorized Passport instance', async () => {
  //     UserRepositoryMock.validateAccessToken.mockResolvedValueOnce([false, { declineReason }]);

  //     const result = await UserSettingsService.authenticate(headers);

  //     expect(result).toBeInstanceOf(Passport);
  //     expect(result.isAuth).toBeFalse();
  //     expect(result.declineReason).toEqual(declineReason);
  //   });
  // });
});
