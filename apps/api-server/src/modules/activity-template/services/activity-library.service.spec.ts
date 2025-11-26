import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { userDummy } from '../../../../test/dummies';
import {
  activityTemplateArrayDummy,
  activityTemplateFromDBDummy,
  activityTemplateFromDBForDifferentUserDummy,
  deserializedStandaloneActivitiesDummy,
  dummyActivityTemplatesForBuildHealthyHabits,
  dummyActivityTemplatesWithTags,
  dummyGetRoutineSuggestionsDto,
  expectedActivityWithUserDuration20,
  upsertActiivtyTemplateDummy,
} from '../../../../test/dummies/habit-packs.dummies';
import {
  ActivityRepositoryMock,
  ActivityTemplateParserServiceMock,
  ActivityTemplateRepositoryMock,
  OpenAIServiceMock,
  ActivityTemplateRetrieverServiceMock,
  RoutineSuggestionGeneratorServiceMock,
  SentryServiceMock,
  UserRepositoryMock,
} from '../../../../test/mocks';
import { UserRepository } from '../../user/repositories/user.repository';
import { ActivityTemplateRepository } from '../repository/activity-template.repository';
import { ActivityLibraryService } from './activity-library.service';
import { ActivityTemplateParserService } from './activity-template-parser.service';
import { ActivityRepository } from '../../activity/repositories/activity.repository';
import { ONE_MINUTE_SECONDS } from '../../../shared/utils/constants';
import { ActivityTemplate } from '../entity/activity-template.entity';
import { OpenAIService } from '../../../../../../libs/openai/src/openai.service';
import { ActivityTemplateRetrieverService } from './activity-template-retriever.service';
import { RoutineSuggestionGeneratorService } from './routine-suggestion-generator.service';
import { ActivityType } from '../../activity/domain/activity-type.enum';
import { HabitLibraryRequestRepository } from '../repository/habit-library-request.repository';

describe('ActivityLibraryService', () => {
  let activityLibraryService: ActivityLibraryService;
  const habitLibraryRequestRepositoryMock = {
    logRequests: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ActivityLibraryService,
        UserRepository,
        ActivityTemplateParserService,
        ActivityTemplateRepository,
        ActivityRepository,
        {
          provide: OpenAIService,
          useValue: OpenAIServiceMock,
        },
        {
          provide: ActivityTemplateRetrieverService,
          useValue: ActivityTemplateRetrieverServiceMock,
        },
        {
          provide: RoutineSuggestionGeneratorService,
          useValue: RoutineSuggestionGeneratorServiceMock,
        },
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
        {
          provide: HabitLibraryRequestRepository,
          useValue: habitLibraryRequestRepositoryMock,
        },
      ],
    })
      .overrideProvider(ActivityTemplateRepository)
      .useValue(ActivityTemplateRepositoryMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(ActivityRepository)
      .useValue(ActivityRepositoryMock)
      .overrideProvider(ActivityTemplateRetrieverService)
      .useValue(ActivityTemplateRetrieverServiceMock)
      .overrideProvider(RoutineSuggestionGeneratorService)
      .useValue(RoutineSuggestionGeneratorServiceMock)
      .overrideProvider(HabitLibraryRequestRepository)
      .useValue(habitLibraryRequestRepositoryMock)
      .compile();

    activityLibraryService = moduleRef.get<ActivityLibraryService>(ActivityLibraryService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(activityLibraryService).toBeDefined();
  });

  afterEach(() => {
    jest.clearAllMocks();
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

      expect(ActivityTemplateRepositoryMock.consistentlyUpdateLibraryActivities).toHaveBeenCalledWith(
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
      const matched_activities = activityLibraryService.userDesiredRoutineDurationSeconds(
        dummyActivityTemplatesWithTags,
        dummyGetRoutineSuggestionsDto.routine_duration * 60, // convert minutes to seconds
      );

      ActivityTemplateRepositoryMock.getActivityTemplatesWithGoalsMatched.mockResolvedValueOnce(matched_activities);

      const response = (await activityLibraryService.getActivitiesRelatedToUserGoals(
        dummyGetRoutineSuggestionsDto,
        userDummy.id,
      )) as ActivityTemplate[];

      const sanitize = (activity: any) => {
        const {
          id,
          tags,
          original_template_id,
          ai_justification,
          ai_match_score,
          ai_goals,
          ai_generated,
          description,
          ...rest
        } = activity;
        return rest;
      };
      const expectedWithoutIds = expectedActivityWithUserDuration20.map(sanitize);
      const responseWithoutIds = response.map(sanitize);

      expect(response).toHaveLength(expectedActivityWithUserDuration20.length);

      // The response should contain all expected objects, regardless of order.
      expect(responseWithoutIds).toEqual(expect.arrayContaining(expectedWithoutIds));

      // verify that all returned activity IDs are unique.
      const responseIds = response.map((activity) => activity.id);
      const uniqueIds = new Set(responseIds);
      expect(uniqueIds.size).toBe(responseIds.length);
    });

    it('positive: strips emoji characters from user goals before querying templates', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      const dtoWithEmojiGoals = {
        ...dummyGetRoutineSuggestionsDto,
        user_goals: [
          '🧘 Improve mental well-being',
          '🚀 Boost productivity',
          '🏋️‍♂️ Focus on health & fitness',
          '❤️ Strengthen relationships',
        ],
      };
      ActivityTemplateRepositoryMock.getActivityTemplatesWithGoalsMatched.mockResolvedValueOnce(
        dummyActivityTemplatesForBuildHealthyHabits,
      );

      await activityLibraryService.getActivitiesRelatedToUserGoals(dtoWithEmojiGoals, userDummy.id);

      expect(ActivityTemplateRepositoryMock.getActivityTemplatesWithGoalsMatched).toHaveBeenCalledWith(
        expect.objectContaining({
          user_goals: expect.arrayContaining([
            'Improve mental well-being',
            'Boost productivity',
            'Focus on health & fitness',
            'Strengthen relationships',
          ]),
        }),
      );
    });

    it('positive: should return array of activity tags matched user_goals & duration less than equal to routine_duration for all routines, activity ids should also be unique', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);

      ActivityTemplateRepositoryMock.getActivityTemplatesWithGoalsMatched.mockResolvedValueOnce(
        dummyActivityTemplatesForBuildHealthyHabits,
      );

      const response = (await activityLibraryService.getActivitiesRelatedToUserGoals(
        { ...dummyGetRoutineSuggestionsDto },
        userDummy.id,
      )) as ActivityTemplate[];
      const responseHabitsTotalDuration = response.reduce((total, activity) => {
        const result = total + activity.duration_seconds;
        return result;
      }, 0);
      const dtoRoutineDurationInSeconds = dummyGetRoutineSuggestionsDto.routine_duration * ONE_MINUTE_SECONDS;

      expect(dtoRoutineDurationInSeconds).toBeLessThanOrEqual(responseHabitsTotalDuration);

      const activityIds = response.map((activity) => activity.id);
      const dummyActivityIds = dummyActivityTemplatesForBuildHealthyHabits.map((activity) => activity.id);
      const hasDuplicates = activityIds.some((activityId) => dummyActivityIds.includes(activityId));
      expect(hasDuplicates).toBe(false);
    });

    it('negative: should return empty if routine duration are less than activities duration', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);

      ActivityTemplateRepositoryMock.getActivityTemplatesWithGoalsMatched.mockResolvedValueOnce(
        dummyActivityTemplatesForBuildHealthyHabits,
      );
      ActivityTemplateRetrieverServiceMock.retrieveByGoal.mockResolvedValue([]);
      RoutineSuggestionGeneratorServiceMock.generateSuggestions.mockResolvedValue({
        accepted: [],
        rejectedCount: 0,
        parsedCount: 0,
        minScoreApplied: 0.5,
      });
      RoutineSuggestionGeneratorServiceMock.generateNewHabits.mockResolvedValue([]);

      const response = (await activityLibraryService.getActivitiesRelatedToUserGoals(
        { ...dummyGetRoutineSuggestionsDto, routine_duration: 1 },
        userDummy.id,
      )) as ActivityTemplate[];

      expect(response).toEqual([]);
    });

    it('logs routineType from habit activity_type when recording generated habits', async () => {
      const habit = {
        name: 'AI Stretch',
        description: 'Generated',
        duration_seconds: 120,
        activity_type: ActivityType.morning,
        ai_generated: true,
      };

      await (activityLibraryService as any).logAdjustedGeneratedHabits([habit], userDummy.id, {
        user_goals: ['mobility'],
        routine_duration: 30,
        groupByGoals: false,
      });

      expect(habitLibraryRequestRepositoryMock.logRequests).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            routineType: ActivityType.morning,
          }),
        ]),
      );
    });

    it('falls back to RAG when matches exist but exceed duration budget', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      const longTemplate = {
        ...dummyActivityTemplatesWithTags[0],
        duration_seconds: 15 * ONE_MINUTE_SECONDS,
      };
      ActivityTemplateRepositoryMock.getActivityTemplatesWithGoalsMatched.mockResolvedValueOnce([longTemplate]);
      ActivityTemplateRetrieverServiceMock.retrieveByGoal.mockResolvedValueOnce([
        { activityTemplateId: longTemplate.id, similarity: 0.9 },
      ]);
      ActivityTemplateRepositoryMock.orm.find.mockResolvedValueOnce([longTemplate]);
      RoutineSuggestionGeneratorServiceMock.generateSuggestions.mockResolvedValueOnce({
        accepted: [
          {
            habitId: longTemplate.id,
            name: 'Shortened Habit',
            justification: 'Adjusted to fit time budget',
            matchScore: 0.9,
            template: longTemplate,
            description: 'desc',
          },
        ],
        rejectedCount: 0,
        parsedCount: 1,
        minScoreApplied: 0.5,
      });

      const response = await activityLibraryService.getActivitiesRelatedToUserGoals(
        { ...dummyGetRoutineSuggestionsDto, routine_duration: 1, groupByGoals: true },
        userDummy.id,
      );

      expect(ActivityTemplateRetrieverServiceMock.retrieveByGoal).toHaveBeenCalled();
      expect(response).toEqual(
        Object.fromEntries((dummyGetRoutineSuggestionsDto.user_goals ?? []).map((goal) => [goal, expect.any(Array)])),
      );
    });

    it('falls back to RAG pipeline when direct matches are empty', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      ActivityTemplateRepositoryMock.getActivityTemplatesWithGoalsMatched.mockResolvedValueOnce([]);
      const template = dummyActivityTemplatesWithTags[0];
      ActivityTemplateRetrieverServiceMock.retrieveByGoal.mockResolvedValueOnce([
        { activityTemplateId: template.id, similarity: 0.92 },
      ]);
      ActivityTemplateRepositoryMock.orm.find.mockResolvedValueOnce([template]);
      RoutineSuggestionGeneratorServiceMock.generateSuggestions.mockResolvedValueOnce({
        accepted: [
          {
            habitId: template.id,
            name: 'Goal-Aligned Strength Session',
            justification: 'Supports strength goals.',
            matchScore: 0.9,
            template,
          },
        ],
        rejectedCount: 0,
        parsedCount: 1,
        minScoreApplied: 0.5,
      });

      const dto = {
        ...dummyGetRoutineSuggestionsDto,
        user_goals: ['Get buffed'],
      };

      const response = await activityLibraryService.getActivitiesRelatedToUserGoals(dto, userDummy.id);

      expect(ActivityTemplateRetrieverServiceMock.retrieveByGoal).toHaveBeenCalledWith('Get buffed', 10);
      expect(RoutineSuggestionGeneratorServiceMock.generateSuggestions).toHaveBeenCalled();
      expect(response).toHaveLength(1);
      expect(response[0]).toHaveProperty('ai_justification', 'Supports strength goals.');
      expect(response[0]).toHaveProperty('original_template_id', template.id);
      expect(response[0].name).toBe('Goal-Aligned Strength Session');
    });

    it('generates new habits via AI when no template suggestions exist', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      ActivityTemplateRepositoryMock.getActivityTemplatesWithGoalsMatched.mockResolvedValueOnce([]);
      ActivityTemplateRetrieverServiceMock.retrieveByGoal.mockResolvedValueOnce([]);
      RoutineSuggestionGeneratorServiceMock.generateSuggestions.mockResolvedValueOnce({
        accepted: [],
        rejectedCount: 0,
        parsedCount: 0,
        minScoreApplied: 0.5,
      });
      RoutineSuggestionGeneratorServiceMock.generateNewHabits.mockResolvedValueOnce([
        {
          name: 'AI Buff Builder',
          description: 'Strength routine generated for the user goal.',
          routineType: ActivityType.morning,
          durationMinutes: 18,
          justification: 'Aligns with muscle gain objective.',
        },
      ]);

      const dto = {
        ...dummyGetRoutineSuggestionsDto,
        user_goals: ['Get buffed'],
      };

      const response = await activityLibraryService.getActivitiesRelatedToUserGoals(dto, userDummy.id);

      expect(RoutineSuggestionGeneratorServiceMock.generateNewHabits).toHaveBeenCalledWith(
        'Get buffed',
        expect.objectContaining({
          limit: 10,
          routineDurationSeconds: dto.routine_duration * ONE_MINUTE_SECONDS,
        }),
      );
      expect(response).toHaveLength(1);
      expect(response[0].name).toBe('AI Buff Builder');
      expect(response[0].ai_generated).toBe(true);
      expect(response[0].description).toBe('Strength routine generated for the user goal.');
      expect(response[0].ai_justification).toBe('Aligns with muscle gain objective.');
    });

    it('falls back to generated habits when all suggested match scores are below threshold', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      ActivityTemplateRepositoryMock.getActivityTemplatesWithGoalsMatched.mockResolvedValueOnce([]);
      const template = dummyActivityTemplatesWithTags[0];
      ActivityTemplateRetrieverServiceMock.retrieveByGoal.mockResolvedValueOnce([
        { activityTemplateId: template.id, similarity: 0.82 },
      ]);
      ActivityTemplateRepositoryMock.orm.find.mockResolvedValueOnce([template]);
      RoutineSuggestionGeneratorServiceMock.generateSuggestions.mockResolvedValueOnce({
        accepted: [],
        rejectedCount: 1,
        parsedCount: 1,
        minScoreApplied: 0.5,
      });
      RoutineSuggestionGeneratorServiceMock.generateNewHabits.mockResolvedValueOnce([
        {
          name: 'Precision Brush Drills',
          description: 'Fine-motor practice session tailored to calligraphy basics.',
          routineType: ActivityType.evening,
          durationMinutes: 12,
          justification: 'Directly supports handwriting control.',
        },
      ]);

      const dto = {
        ...dummyGetRoutineSuggestionsDto,
        user_goals: ['Learn Japanese calligraphy'],
      };

      const response = await activityLibraryService.getActivitiesRelatedToUserGoals(dto, userDummy.id);

      expect(RoutineSuggestionGeneratorServiceMock.generateNewHabits).toHaveBeenCalledWith(
        'Learn Japanese calligraphy',
        expect.objectContaining({
          limit: 10,
          routineDurationSeconds: dto.routine_duration * ONE_MINUTE_SECONDS,
        }),
      );
      expect(response).toHaveLength(1);
      expect(response[0].name).toBe('Precision Brush Drills');
      expect(response[0].ai_generated).toBe(true);
      expect(response[0].description).toBe('Fine-motor practice session tailored to calligraphy basics.');
    });

    it('uses similarity fallback when generation fails after all suggestions are rejected', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      ActivityTemplateRepositoryMock.getActivityTemplatesWithGoalsMatched.mockResolvedValueOnce([]);
      const template = dummyActivityTemplatesWithTags[0];
      ActivityTemplateRetrieverServiceMock.retrieveByGoal.mockResolvedValueOnce([
        { activityTemplateId: template.id, similarity: 0.6 },
      ]);
      ActivityTemplateRepositoryMock.orm.find.mockResolvedValueOnce([template]);
      RoutineSuggestionGeneratorServiceMock.generateSuggestions.mockResolvedValueOnce({
        accepted: [],
        rejectedCount: 1,
        parsedCount: 1,
        minScoreApplied: 0.5,
      });
      RoutineSuggestionGeneratorServiceMock.generateNewHabits.mockResolvedValueOnce([]);

      const dto = {
        ...dummyGetRoutineSuggestionsDto,
        user_goals: ['Improve mobility'],
      };

      const response = await activityLibraryService.getActivitiesRelatedToUserGoals(dto, userDummy.id);

      expect(RoutineSuggestionGeneratorServiceMock.generateNewHabits).toHaveBeenCalledWith(
        'Improve mobility',
        expect.objectContaining({
          limit: 10,
          routineDurationSeconds: dto.routine_duration * ONE_MINUTE_SECONDS,
        }),
      );
      expect(response).toHaveLength(1);
      expect(response[0].original_template_id).toBe(template.id);
      expect(response[0].ai_generated).toBe(false);
      expect(response[0].ai_match_score).toBeCloseTo(0.6, 2);
      expect(response[0].ai_justification).toContain('Closest available habit');
    });

    it('logs generated habits for later review', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      ActivityTemplateRepositoryMock.getActivityTemplatesWithGoalsMatched.mockResolvedValueOnce([]);
      ActivityTemplateRetrieverServiceMock.retrieveByGoal.mockResolvedValueOnce([]);
      const generatedHabit = {
        name: 'AI Buff Builder',
        description: 'Strength routine generated for the user goal.',
        routineType: ActivityType.morning,
        durationMinutes: 18,
        justification: 'Aligns with muscle gain objective.',
      };
      RoutineSuggestionGeneratorServiceMock.generateSuggestions.mockResolvedValueOnce({
        accepted: [],
        rejectedCount: 0,
        parsedCount: 0,
        minScoreApplied: 0.5,
      });
      RoutineSuggestionGeneratorServiceMock.generateNewHabits.mockResolvedValueOnce([generatedHabit]);

      const dto = {
        ...dummyGetRoutineSuggestionsDto,
        user_id: userDummy.id,
        user_goals: ['Get buffed'],
      };

      await activityLibraryService.getActivitiesRelatedToUserGoals(dto, userDummy.id);

      expect(habitLibraryRequestRepositoryMock.logRequests).toHaveBeenCalledWith([
        expect.objectContaining({
          userId: userDummy.id,
          goal: 'Get buffed',
          habitName: generatedHabit.name,
          habitDescription: generatedHabit.description,
          routineType: ActivityType.morning,
          durationMinutes: generatedHabit.durationMinutes,
          justification: generatedHabit.justification,
        }),
      ]);
    });

    it('does not log when only library templates are returned', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      const matched_activities = activityLibraryService.userDesiredRoutineDurationSeconds(
        dummyActivityTemplatesWithTags,
        dummyGetRoutineSuggestionsDto.routine_duration * ONE_MINUTE_SECONDS,
      );

      ActivityTemplateRepositoryMock.getActivityTemplatesWithGoalsMatched.mockResolvedValueOnce(matched_activities);

      await activityLibraryService.getActivitiesRelatedToUserGoals(dummyGetRoutineSuggestionsDto, userDummy.id);

      expect(habitLibraryRequestRepositoryMock.logRequests).not.toHaveBeenCalled();
    });

    it('positive: should return unique activity templates grouped by goals, matching user goals and within routine duration', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);

      ActivityTemplateRepositoryMock.getActivityTemplatesWithGoalsMatched.mockResolvedValueOnce(
        dummyActivityTemplatesForBuildHealthyHabits,
      );

      const response = (await activityLibraryService.getActivitiesRelatedToUserGoals(
        { ...dummyGetRoutineSuggestionsDto, groupByGoals: true },
        userDummy.id,
      )) as Record<string, any[]>;

      for (const [goal, templates] of Object.entries(response)) {
        expect(dummyGetRoutineSuggestionsDto.user_goals).toContain(goal);
        expect(Array.isArray(templates)).toBe(true);
      }
    });

    it('negative: should return an empty object when no activities match the routine duration and grouping is enabled', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);

      ActivityTemplateRepositoryMock.getActivityTemplatesWithGoalsMatched.mockResolvedValueOnce(
        dummyActivityTemplatesForBuildHealthyHabits,
      );

      const response = (await activityLibraryService.getActivitiesRelatedToUserGoals(
        { ...dummyGetRoutineSuggestionsDto, routine_duration: 1, groupByGoals: true },
        userDummy.id,
      )) as Record<string, any[]>;

      const expectedGoals = (dummyGetRoutineSuggestionsDto.user_goals ?? []).slice().sort();
      expect(Object.keys(response).sort()).toEqual(expectedGoals);
      Object.values(response).forEach((templates) => {
        expect(Array.isArray(templates)).toBe(true);
        expect(templates).toHaveLength(0);
      });
    });
  });
});
