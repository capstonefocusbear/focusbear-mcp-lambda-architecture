import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { standaloneHabitPackDummy } from '../../../../test/dummies/habit-packs.dummies';
import {
  ActivityTemplateRepositoryMock,
  HabitPackRepositoryMock,
  HabitPackServiceMock,
  SentryServiceMock,
  UserRepositoryMock,
} from '../../../../test/mocks';
import { ActivityTemplateRepository } from '../repository/activity-template.repository';
import { ActivityTemplateService } from './activity-template.service';
import { HabitPackService } from '../../habit-pack/services/habit-pack/habit-pack.service';
import { HabitPackRepository } from '../../habit-pack/repositories/habit-pack.repository';
import { UserRepository } from '../../user/repositories/user.repository';

describe('ActivityTemplateService', () => {
  let activityTemplateService: ActivityTemplateService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ActivityTemplateService,
        ActivityTemplateRepository,
        HabitPackService,
        HabitPackRepository,
        UserRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(ActivityTemplateRepository)
      .useValue(ActivityTemplateRepositoryMock)
      .overrideProvider(HabitPackService)
      .useValue(HabitPackServiceMock)
      .overrideProvider(HabitPackRepository)
      .useValue(HabitPackRepositoryMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .compile();

    activityTemplateService = moduleRef.get<ActivityTemplateService>(ActivityTemplateService);
  });

  it('should be defined', () => {
    expect(activityTemplateService).toBeDefined();
  });

  describe('bulkDeleteActivityTemplates', () => {
    it('Positive: should delete the activity template', async () => {
      HabitPackRepositoryMock.orm.findOne.mockResolvedValueOnce(standaloneHabitPackDummy);
      await activityTemplateService.bulkDeleteActivityTemplates(standaloneHabitPackDummy.id);

      expect(ActivityTemplateRepositoryMock.orm.softDelete).toHaveBeenCalledWith({
        pack_id: standaloneHabitPackDummy.id,
      });
    });
  });
});
