import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import {
  routineHabitPackDBResponseDummy,
  serializedRoutineActivityDummy,
  serializedStandaloneActivityDummy,
  standaloneHabitPackDBResponseDummy,
  createActivityTemplateContextDummy,
  createActivityTemplateActivityDataDummy,
  activityTemplateArrayDummy,
} from '../../../../test/dummies/habit-packs.dummies';
import { serializedActivityDummy, userDummy } from '../../../../test/dummies';
import {
  ActivityTemplateRepositoryMock,
  HabitPackRepositoryMock,
  SentryServiceMock,
  UserRepositoryMock,
} from '../../../../test/mocks';
import { HabitPackType } from '../../habit-pack/domain/habit-pack-type.enum';
import { HabitPackRepository } from '../../habit-pack/repositories/habit-pack.repository';
import { UserRepository } from '../../user/repositories/user.repository';
import { ActivityTemplate } from '../entity/activity-template.entity';
import { ActivityTemplateRepository } from '../repository/activity-template.repository';
import { ActivityTemplateParserService } from './activity-template-parser.service';

describe('ActivityTemplateParserService', () => {
  let activityTemplateParserService: ActivityTemplateParserService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ActivityTemplateParserService,
        ActivityTemplateRepository,
        UserRepository,
        HabitPackRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(ActivityTemplateRepository)
      .useValue(ActivityTemplateRepositoryMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(HabitPackRepository)
      .useValue(HabitPackRepositoryMock)
      .compile();

    activityTemplateParserService = moduleRef.get<ActivityTemplateParserService>(ActivityTemplateParserService);
  });

  it('should be defined', () => {
    expect(activityTemplateParserService).toBeDefined();
  });

  describe('serialize', () => {
    it('Positive: should return serialized activity templates', () => {
      const { activity_templates, pack_type } = standaloneHabitPackDBResponseDummy;
      const result = activityTemplateParserService.serialize(pack_type, activity_templates);

      expect(result).toMatchSnapshot();
    });
  });

  describe('deserializeStandaloneActivities', () => {
    it('Positive: Should return an object containing deserialized standalone activities(formats activity DTOs to ActivityTemplates)', () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      HabitPackRepositoryMock.orm.findOne(standaloneHabitPackDBResponseDummy.id);
      const result = activityTemplateParserService.deserializeStandaloneActivities(
        serializedStandaloneActivityDummy,
        userDummy.id,
        standaloneHabitPackDBResponseDummy.id,
      );

      expect(result).toMatchSnapshot();
    });
  });

  describe('deserializeRoutineActivities', () => {
    it('Positive: Should return an array containing deserialized routine activities(formats activity DTOs to ActivityTemplates)', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      HabitPackRepositoryMock.orm.findOne(routineHabitPackDBResponseDummy.id);
      const result = await activityTemplateParserService.deserializeRoutineActivities(
        serializedRoutineActivityDummy,
        userDummy.id,
        standaloneHabitPackDBResponseDummy.id,
      );

      expect(result).toMatchSnapshot();
    });
  });

  describe('deserializeLibraryActivities', () => {
    it('Positive: Should convert UpdateActivityDto type activities to ActivityTemplate class and return them in an array', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      const { deserializedActivityTemplates } = activityTemplateParserService.deserializeLibraryActivities(
        serializedStandaloneActivityDummy.standalone_activities,
        userDummy.id,
      );

      expect(deserializedActivityTemplates).toBeArray();
      expect(deserializedActivityTemplates[0]).toBeInstanceOf(ActivityTemplate);
      expect(deserializedActivityTemplates).toMatchSnapshot();
    });
  });

  describe('createActivityTemplate', () => {
    it('Positive: Should return an ActivityTemplate array', () => {
      const result = activityTemplateParserService.createActivityTemplate(
        createActivityTemplateActivityDataDummy,
        createActivityTemplateContextDummy,
      );

      expect(result[0]).toBeInstanceOf(ActivityTemplate);
      expect(result).toBeArray();
    });
  });

  describe('serialize', () => {
    it('Positive: Should return SerializedActivityTemplates of type standalone_activities', () => {
      const pack_type = HabitPackType.standalone;
      const result = activityTemplateParserService.serialize(pack_type, activityTemplateArrayDummy);

      expect(result).toHaveProperty('standalone_activities');
      expect(result.standalone_activities).toBeArray();
    });
  });

  describe('serializeLibraryActivities', () => {
    it('Positive: Should format ActivityTemplates to UpdateActivityDto type to send as response', () => {
      const result = activityTemplateParserService.serializeLibraryActivities(activityTemplateArrayDummy);

      expect(result).toBeArray();
      expect(result[0]).toMatchSnapshot();
    });
  });

  describe('getLogQuantityQuestions', () => {
    it('positive: given activities with log quantity questions, it should extract and create log quantity questions and return them in an array', () => {
      const result = activityTemplateParserService.getLogQuantityQuestions(serializedActivityDummy, userDummy.id);

      expect(result).toBeArray();
      expect(result.length).toBe(4);
    });
  });
});
