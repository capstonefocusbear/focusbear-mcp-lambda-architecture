import { Test } from '@nestjs/testing';
import { ActivitySequenceRepositoryMock } from '../../../../../test/mocks';
import { ActivitySequenceRepository } from '../../repositories/activity-sequence.repository';
import { ActivityParserService } from './activity-parser.service';
// import { serializedActivityDummy, userDummy } from '../../../../../test/dummies ';

describe('ActivityParserService', () => {
  let activityParserService: ActivityParserService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [ActivityParserService, ActivitySequenceRepository],
    })
      .overrideProvider(ActivitySequenceRepository)
      .useValue(ActivitySequenceRepositoryMock)
      .compile();

    activityParserService = moduleRef.get<ActivityParserService>(ActivityParserService);
  });

  it('should be defined', () => {
    expect(activityParserService).toBeDefined();
  });

  describe('serialize', () => {
    // it('positive: should return an authorized Passport instance', async () => {
    //   ActivitySequenceRepositoryMock.findOneByTypeForUser.mockReturnValue();
    //   // UserRepositoryMock.validateAccessToken.mockResolvedValueOnce([true, { payload }]);
    //   const result = await activityParserService.deserialize(serializedActivityDummy, userDummy.id);
    //   expect(result).toBeDefined();
    //   // expect(result).toBeInstanceOf(Passport);
    //   // expect(result.isAuth).toBeTrue();
    //   // expect(result.declineReason).toBeNull();
    // });
    // it('negative: should return an unauthorized Passport instance', async () => {
    //   UserRepositoryMock.validateAccessToken.mockResolvedValueOnce([false, { declineReason }]);
    //   const result = await ActivityParserService.authenticate(headers);
    //   expect(result).toBeInstanceOf(Passport);
    //   expect(result.isAuth).toBeFalse();
    //   expect(result.declineReason).toEqual(declineReason);
    // });
  });
});
