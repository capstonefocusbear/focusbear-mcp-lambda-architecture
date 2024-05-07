import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { userDummy } from '../../../../test/dummies';
import {
  activityTemplateArrayDummy,
  activityTemplateFromDBDummy,
  activityTemplateFromDBForDifferentUserDummy,
  deserializedStandaloneActivitiesDummy,
  dummyActivityTemplatesWithTags,
  dummyGetRoutineSuggestionsDto,
  upsertActiivtyTemplateDummy,
} from '../../../../test/dummies/habit-packs.dummies';
import {
  ActivityRepositoryMock,
  ActivityTemplateParserServiceMock,
  ActivityTemplateRepositoryMock,
  SentryServiceMock,
  UserRepositoryMock,
} from '../../../../test/mocks';
import { UserRepository } from '../../user/repositories/user.repository';
import { ActivityTemplateRepository } from '../repository/activity-template.repository';
import { ActivityLibraryService } from './activity-library.service';
import { ActivityTemplateParserService } from './activity-template-parser.service';
import { ActivityRepository } from '../../activity/repositories/activity.repository';

describe('ActivityLibraryService', () => {
  let activityLibraryService: ActivityLibraryService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ActivityLibraryService,
        UserRepository,
        ActivityTemplateParserService,
        ActivityTemplateRepository,
        ActivityRepository,
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
      .overrideProvider(ActivityRepository)
      .useValue(ActivityRepositoryMock)
      .compile();

    activityLibraryService = moduleRef.get<ActivityLibraryService>(ActivityLibraryService);
  });

  it('should be defined', () => {
    expect(activityLibraryService).toBeDefined();
  });

  describe('getLibraryActivities', () => {
    it("negative: given that the user auth token is invalid - should return that the user couldn't be found", async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;
      let exception: any;
      try {
        await activityLibraryService.getLibraryActivities(userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should fetch activity templates from the DB and format them as activity DTOs before returning them as response', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      ActivityTemplateRepositoryMock.orm.find.mockResolvedValueOnce(activityTemplateArrayDummy);
      ActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);

      const response = await activityLibraryService.getLibraryActivities(userDummy.id);

      expect(response).toMatchSnapshot();
    });
  });

  describe('updateLibraryActivities', () => {
    it("negative: given that the user auth token is invalid - should return that the user couldn't be found", async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;
      let exception: any;
      try {
        await activityLibraryService.upsertLibraryActivities(deserializedStandaloneActivitiesDummy[0], userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should format activity DTOs as ActivityTemplates and then upsert activity templates', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy).mockResolvedValueOnce(userDummy);
      ActivityTemplateRepositoryMock.orm.find
        .mockResolvedValueOnce([activityTemplateFromDBDummy])
        .mockResolvedValueOnce([activityTemplateFromDBDummy]);
      ActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);

      const response = await activityLibraryService.upsertLibraryActivities(
        deserializedStandaloneActivitiesDummy[0],
        userDummy.id,
      );

      expect(response).toMatchSnapshot();
    });

    it('positive: incoming activities that belong to a different user should be excluded from update function call', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy).mockResolvedValueOnce(userDummy);
      ActivityTemplateRepositoryMock.orm.find
        .mockResolvedValueOnce([activityTemplateFromDBForDifferentUserDummy])
        .mockResolvedValueOnce([activityTemplateFromDBDummy]);
      ActivityTemplateParserServiceMock.deserializeActivityTemplateChoices.mockReturnValueOnce({
        deserializedActivityTemplates: [],
        logQuantityQuestions: [],
      });
      ActivityRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await activityLibraryService.upsertLibraryActivities([upsertActiivtyTemplateDummy], userDummy.id);

      expect(ActivityTemplateRepositoryMock.consistentlyUpdateLibraryActivities).toBeCalledWith(
        [],
        [],
        userDummy.id,
        [],
        [],
      );
    });
  });

  describe('getActivitiesRelatedToUserGoals', () => {
    it("negative: given that the user auth token is invalid - should return that the user couldn't be found", async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;
      let exception: any;
      try {
        await activityLibraryService.getActivitiesRelatedToUserGoals(dummyGetRoutineSuggestionsDto, userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should return array of activity tags matched user_goals & duration less than equal to routine_duration', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      ActivityTemplateRepositoryMock.getActivityTemplatesWithGoalsMatched.mockResolvedValueOnce(
        dummyActivityTemplatesWithTags.slice(0, 3),
      );

      const response = await activityLibraryService.getActivitiesRelatedToUserGoals(
        dummyGetRoutineSuggestionsDto,
        userDummy.id,
      );

      expect(response).toHaveLength(dummyActivityTemplatesWithTags.slice(0, 3).length);
      expect(response).toMatchObject(dummyActivityTemplatesWithTags);
    });
  });
});
