import { Test, TestingModule } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { ActivityLibraryService } from './activity-library.service';
import { ActivityTemplateRepository } from '../repository/activity-template.repository';
import { ActivityTemplateParserService } from './activity-template-parser.service';
import { ActivityRepository } from '../../activity/repositories/activity.repository';
import { UserRepository } from '../../user/repositories/user.repository';
import { OpenAIService } from '../../../../../../libs/openai/src/openai.service';
import { AdjustHabitsWithAiDto } from '../dto/adjust-habits-with-ai.dto';
import { SentryServiceMock } from '../../../../test/mocks';

describe('ActivityLibraryService', () => {
  let service: ActivityLibraryService;
  let openAIService: jest.Mocked<OpenAIService>;

  const mockActivityTemplateRepository = {
    orm: {
      find: jest.fn(),
      findOneBy: jest.fn(),
    },
    getActivityTemplatesWithGoalsMatched: jest.fn(),
    consistentlyUpdateLibraryActivities: jest.fn(),
  };

  const mockActivityTemplateParserService = {
    serializeLibraryActivities: jest.fn(),
    deserializeLibraryActivities: jest.fn(),
  };

  const mockActivityRepository = {
    orm: {
      find: jest.fn(),
    },
  };

  const mockUserRepository = {
    orm: {
      findOneBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLibraryService,
        {
          provide: ActivityTemplateRepository,
          useValue: mockActivityTemplateRepository,
        },
        {
          provide: ActivityTemplateParserService,
          useValue: mockActivityTemplateParserService,
        },
        {
          provide: ActivityRepository,
          useValue: mockActivityRepository,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: OpenAIService,
          useValue: {
            adjustHabitsWithAi: jest.fn(),
          },
        },
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    }).compile();

    service = module.get<ActivityLibraryService>(ActivityLibraryService);
    openAIService = module.get(OpenAIService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('adjustHabitsWithAi', () => {
    it('should adjust habits using AI service', async () => {
      const userId = 'test-user-id';
      const adjustDto: AdjustHabitsWithAiDto = {
        current_habits: [
          {
            id: 'habit-1',
            name: 'Morning Meditation',
            activity_type: 'morning',
            duration_seconds: 300,
          },
        ],
        user_feedback: 'Make it more specific',
        user_goals: ['wellness'],
        routine_duration: 15,
      };

      const expectedAdjustedHabits = [
        {
          id: 'habit-1',
          name: 'Guided Morning Meditation',
          activity_type: 'morning',
          duration_seconds: 300,
          text_instructions:
            'Sit in a quiet space and follow a 5-minute guided meditation focusing on breath awareness',
        },
      ];

      mockUserRepository.orm.findOneBy.mockResolvedValue({ id: userId });
      openAIService.adjustHabitsWithAi.mockResolvedValue(expectedAdjustedHabits);

      const result = await service.adjustHabitsWithAi(adjustDto, userId);

      expect(openAIService.adjustHabitsWithAi).toHaveBeenCalledWith(
        adjustDto.current_habits,
        adjustDto.user_feedback,
        adjustDto.user_goals,
        adjustDto.routine_duration,
      );
      expect(result).toEqual(expectedAdjustedHabits);
    });

    it('should throw error if user not found', async () => {
      const userId = 'non-existent-user';
      const adjustDto: AdjustHabitsWithAiDto = {
        current_habits: [],
        user_feedback: 'test feedback',
      };

      mockUserRepository.orm.findOneBy.mockResolvedValue(null);

      await expect(service.adjustHabitsWithAi(adjustDto, userId)).rejects.toThrow(
        `User with ID: ${userId} does not exist!`,
      );
    });
  });
});
