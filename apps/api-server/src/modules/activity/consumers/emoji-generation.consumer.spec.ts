import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { SENTRY_TOKEN } from '@app/observability';
import { Job } from 'bull';
import { OpenAIService } from '@app/openai';
import { R2Service } from '@app/r2';
import { ActivityRepository } from '../repositories/activity.repository';
import { BullQueues, S3_BUCKET_EMOJIS } from '../../../shared/utils/constants';
import { EmojiGenerationConsumer } from './emoji-generation.consumer';
import { SentryServiceMock, OpenAIServiceMock, R2ServiceMock, ActivityRepositoryMock } from '../../../../test/mocks';

describe('EmojiGenerationConsumer', () => {
  let emojiGenerationConsumer: EmojiGenerationConsumer;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        EmojiGenerationConsumer,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
        {
          provide: OpenAIService,
          useValue: OpenAIServiceMock,
        },
        {
          provide: ActivityRepository,
          useValue: ActivityRepositoryMock,
        },
        {
          provide: R2Service,
          useValue: R2ServiceMock,
        },
        {
          provide: getQueueToken(BullQueues.EMOJI_GENERATION),
          useValue: { add: jest.fn() },
        },
      ],
    }).compile();

    emojiGenerationConsumer = moduleRef.get<EmojiGenerationConsumer>(EmojiGenerationConsumer);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(emojiGenerationConsumer).toBeDefined();
  });

  describe('generateActivityEmoji', () => {
    const mockJob = {
      data: {
        activity_id: 'test-activity-id',
        activity_name: 'test-activity-name',
      },
    } as Job<{ activity_id: string; activity_name: string }>;

    it('should generate emoji when no cached emoji exists', async () => {
      // Mock R2Service to return null (no cached emoji)
      R2ServiceMock.getJsonFromBucket.mockResolvedValue({});

      // Mock OpenAI to return a valid emoji
      OpenAIServiceMock.generateEmojiForActivity.mockResolvedValue('🏃‍♂️');

      // Mock activity repository to return an activity with activity_data
      ActivityRepositoryMock.orm.findOne.mockResolvedValue({
        id: 'test-activity-id',
        activity_data: {
          name: 'test-activity-name',
          habit_icon: '',
        },
      } as any);

      // Mock R2Service updateS3Emojis
      R2ServiceMock.addObjectToBucket.mockResolvedValue(undefined);

      await emojiGenerationConsumer.generateActivityEmoji(mockJob);

      // Verify that getCachedEmoji was called
      expect(R2ServiceMock.getJsonFromBucket).toHaveBeenCalledWith(S3_BUCKET_EMOJIS, 'activity-emojis');

      // Verify that OpenAI was called to generate emoji
      expect(OpenAIServiceMock.generateEmojiForActivity).toHaveBeenCalledWith('test-activity-name');

      // Verify that the emoji was saved to S3
      expect(R2ServiceMock.addObjectToBucket).toHaveBeenCalledWith(S3_BUCKET_EMOJIS, 'activity-emojis', {
        'test-activity-name': '🏃‍♂️',
      });

      // Verify that the activity was updated with the new emoji
      expect(ActivityRepositoryMock.orm.update).toHaveBeenCalledWith('test-activity-id', {
        activity_data: {
          name: 'test-activity-name',
          habit_icon: '🏃‍♂️',
        },
      });
    });

    it('should generate emoji when no cached emoji exists 2', async () => {
      // Mock R2Service to return null (no cached emoji)
      R2ServiceMock.getJsonFromBucket.mockResolvedValue({});

      // Mock OpenAI to return a valid emoji
      OpenAIServiceMock.generateEmojiForActivity.mockResolvedValue('🧹');

      // Mock activity repository to return an activity with activity_data
      ActivityRepositoryMock.orm.findOne.mockResolvedValue({
        id: 'test-activity-id',
        activity_data: {
          name: 'test-activity-name',
          habit_icon: '',
        },
      } as any);

      // Mock R2Service updateS3Emojis
      R2ServiceMock.addObjectToBucket.mockResolvedValue(undefined);

      await emojiGenerationConsumer.generateActivityEmoji(mockJob);

      // Verify that getCachedEmoji was called
      expect(R2ServiceMock.getJsonFromBucket).toHaveBeenCalledWith(S3_BUCKET_EMOJIS, 'activity-emojis');

      // Verify that OpenAI was called to generate emoji
      expect(OpenAIServiceMock.generateEmojiForActivity).toHaveBeenCalledWith('test-activity-name');

      // Verify that the emoji was saved to S3
      expect(R2ServiceMock.addObjectToBucket).toHaveBeenCalledWith(S3_BUCKET_EMOJIS, 'activity-emojis', {
        'test-activity-name': '🧹',
      });

      // Verify that the activity was updated with the new emoji
      expect(ActivityRepositoryMock.orm.update).toHaveBeenCalledWith('test-activity-id', {
        activity_data: {
          name: 'test-activity-name',
          habit_icon: '🧹',
        },
      });
    });

    it('should not use invalid emoji', async () => {
      // Mock R2Service to return null (no cached emoji)
      R2ServiceMock.getJsonFromBucket.mockResolvedValue(null);

      // Mock OpenAI to return an invalid emoji (not an emoji)
      OpenAIServiceMock.generateEmojiForActivity.mockResolvedValue('this is not an emoji');

      // Mock activity repository to return an activity with activity_data
      ActivityRepositoryMock.orm.findOne.mockResolvedValue({
        id: 'test-activity-id',
        activity_data: {
          name: 'test-activity-name',
          habit_icon: '',
        },
      } as any);

      await emojiGenerationConsumer.generateActivityEmoji(mockJob);

      // Verify that getCachedEmoji was called
      expect(R2ServiceMock.getJsonFromBucket).toHaveBeenCalledWith(S3_BUCKET_EMOJIS, 'activity-emojis');

      // Verify that OpenAI was called to generate emoji
      expect(OpenAIServiceMock.generateEmojiForActivity).toHaveBeenCalledWith('test-activity-name');

      // Verify that the emoji was NOT saved to S3 since it's invalid
      expect(R2ServiceMock.addObjectToBucket).not.toHaveBeenCalled();

      // Verify that the activity was NOT updated since emoji was invalid
      expect(ActivityRepositoryMock.orm.update).not.toHaveBeenCalled();
    });

    it('should use cached emoji when it exists', async () => {
      // Mock R2Service to return cached emojis
      const cachedEmojis = {
        'test-activity-name': '🏃‍♂️',
        'other-activity': '📚',
      };
      R2ServiceMock.getJsonFromBucket.mockResolvedValue(cachedEmojis);

      // Mock activity repository to return an activity with activity_data
      ActivityRepositoryMock.orm.findOne.mockResolvedValue({
        id: 'test-activity-id',
        activity_data: {
          name: 'test-activity-name',
          habit_icon: '',
        },
      } as any);

      await emojiGenerationConsumer.generateActivityEmoji(mockJob);

      // Verify that getCachedEmoji was called
      expect(R2ServiceMock.getJsonFromBucket).toHaveBeenCalledWith(S3_BUCKET_EMOJIS, 'activity-emojis');

      // Verify that OpenAI was NOT called since cached emoji exists
      expect(OpenAIServiceMock.generateEmojiForActivity).not.toHaveBeenCalled();

      // Verify that the activity was updated with the cached emoji
      expect(ActivityRepositoryMock.orm.update).toHaveBeenCalledWith('test-activity-id', {
        activity_data: {
          name: 'test-activity-name',
          habit_icon: '🏃‍♂️',
        },
      });
    });

    it('should handle case when activity has no activity_data', async () => {
      // Mock R2Service to return null (no cached emoji)
      R2ServiceMock.getJsonFromBucket.mockResolvedValue(null);

      // Mock OpenAI to return a valid emoji
      OpenAIServiceMock.generateEmojiForActivity.mockResolvedValue('🏃‍♂️');

      // Mock activity repository to return an activity without activity_data
      ActivityRepositoryMock.orm.findOne.mockResolvedValue({
        id: 'test-activity-id',
        activity_data: null,
      } as any);

      await emojiGenerationConsumer.generateActivityEmoji(mockJob);

      // Verify that the activity was NOT updated since it has no activity_data
      expect(ActivityRepositoryMock.orm.update).not.toHaveBeenCalled();
    });

    it('should handle case when activity is not found', async () => {
      // Mock R2Service to return null (no cached emoji)
      R2ServiceMock.getJsonFromBucket.mockResolvedValue(null);

      // Mock OpenAI to return a valid emoji
      OpenAIServiceMock.generateEmojiForActivity.mockResolvedValue('🏃‍♂️');

      // Mock activity repository to return null (activity not found)
      ActivityRepositoryMock.orm.findOne.mockResolvedValue(null);

      await emojiGenerationConsumer.generateActivityEmoji(mockJob);

      // Verify that the activity was NOT updated since activity was not found
      expect(ActivityRepositoryMock.orm.update).not.toHaveBeenCalled();
    });

    it('should handle OpenAI service errors gracefully', async () => {
      // Mock R2Service to return null (no cached emoji)
      R2ServiceMock.getJsonFromBucket.mockResolvedValue(null);

      // Mock OpenAI to throw an error
      OpenAIServiceMock.generateEmojiForActivity.mockRejectedValue(new Error('OpenAI API error'));

      await emojiGenerationConsumer.generateActivityEmoji(mockJob);

      // Verify that the error was captured by Sentry
      expect(SentryServiceMock.instance().captureException).toHaveBeenCalledWith(expect.any(Error), { level: 'error' });

      // Verify that the activity was NOT updated since emoji generation failed
      expect(ActivityRepositoryMock.orm.update).not.toHaveBeenCalled();
    });

    it('should handle invalid emoji responses from OpenAI', async () => {
      // Mock R2Service to return null (no cached emoji)
      R2ServiceMock.getJsonFromBucket.mockResolvedValue(null);

      // Mock OpenAI to return an invalid emoji (too long)
      OpenAIServiceMock.generateEmojiForActivity.mockResolvedValue('Some text that is not an emoji');

      await emojiGenerationConsumer.generateActivityEmoji(mockJob);

      // Verify that the activity was NOT updated since emoji was invalid
      expect(ActivityRepositoryMock.orm.update).not.toHaveBeenCalled();

      // Verify that S3 was NOT updated since emoji was invalid
      expect(R2ServiceMock.addObjectToBucket).not.toHaveBeenCalled();
    });

    it('should handle invalid emoji responses from OpenAI 2', async () => {
      // Mock R2Service to return null (no cached emoji)
      R2ServiceMock.getJsonFromBucket.mockResolvedValue(null);

      // Mock OpenAI to return an invalid emoji (too long)
      OpenAIServiceMock.generateEmojiForActivity.mockResolvedValue('🏃‍♂️🏃‍♂️🏃‍♂️🏃‍♂️🏃‍♂️🏃‍♂️🏃‍♂️');

      await emojiGenerationConsumer.generateActivityEmoji(mockJob);

      // Verify that the activity was NOT updated since emoji was invalid
      expect(ActivityRepositoryMock.orm.update).not.toHaveBeenCalled();

      // Verify that S3 was NOT updated since emoji was invalid
      expect(R2ServiceMock.addObjectToBucket).not.toHaveBeenCalled();
    });

    it('should handle empty emoji response from OpenAI', async () => {
      // Mock R2Service to return null (no cached emoji)
      R2ServiceMock.getJsonFromBucket.mockResolvedValue(null);

      // Mock OpenAI to return empty string
      OpenAIServiceMock.generateEmojiForActivity.mockResolvedValue('');

      await emojiGenerationConsumer.generateActivityEmoji(mockJob);

      // Verify that the activity was NOT updated since emoji was empty
      expect(ActivityRepositoryMock.orm.update).not.toHaveBeenCalled();

      // Verify that S3 was NOT updated since emoji was empty
      expect(R2ServiceMock.addObjectToBucket).not.toHaveBeenCalled();
    });

    it('should handle null emoji response from OpenAI', async () => {
      // Mock R2Service to return null (no cached emoji)
      R2ServiceMock.getJsonFromBucket.mockResolvedValue(null);

      // Mock OpenAI to return null
      OpenAIServiceMock.generateEmojiForActivity.mockResolvedValue(null);

      await emojiGenerationConsumer.generateActivityEmoji(mockJob);

      // Verify that the activity was NOT updated since emoji was null
      expect(ActivityRepositoryMock.orm.update).not.toHaveBeenCalled();

      // Verify that S3 was NOT updated since emoji was null
      expect(R2ServiceMock.addObjectToBucket).not.toHaveBeenCalled();
    });

    it('should handle database update errors gracefully', async () => {
      // Mock R2Service to return null (no cached emoji)
      R2ServiceMock.getJsonFromBucket.mockResolvedValue(null);

      // Mock OpenAI to return a valid emoji
      OpenAIServiceMock.generateEmojiForActivity.mockResolvedValue('🏃‍♂️');

      // Mock activity repository to return an activity with activity_data
      ActivityRepositoryMock.orm.findOne.mockResolvedValue({
        id: 'test-activity-id',
        activity_data: {
          name: 'test-activity-name',
          habit_icon: '',
        },
      } as any);

      // Mock activity repository update to throw an error
      ActivityRepositoryMock.orm.update.mockRejectedValue(new Error('Database update error'));

      await emojiGenerationConsumer.generateActivityEmoji(mockJob);

      // Verify that the error was captured by Sentry
      expect(SentryServiceMock.instance().captureException).toHaveBeenCalledWith(expect.any(Error), { level: 'error' });
    });

    it('should add breadcrumbs for successful emoji generation', async () => {
      // Mock R2Service to return null (no cached emoji)
      R2ServiceMock.getJsonFromBucket.mockResolvedValue(null);

      // Mock OpenAI to return a valid emoji
      OpenAIServiceMock.generateEmojiForActivity.mockResolvedValue('🏃‍♂️');

      // Mock activity repository to return an activity with activity_data
      ActivityRepositoryMock.orm.findOne.mockResolvedValue({
        id: 'test-activity-id',
        activity_data: {
          name: 'test-activity-name',
          habit_icon: '',
        },
      } as any);

      // Mock R2Service updateS3Emojis
      R2ServiceMock.addObjectToBucket.mockResolvedValue(undefined);

      await emojiGenerationConsumer.generateActivityEmoji(mockJob);
    });

    describe('caching functionality', () => {
      it('should properly cache emojis in S3', async () => {
        const mockJobForCaching = {
          data: {
            activity_id: 'test-activity-id',
            activity_name: 'new-activity',
          },
        } as Job<{ activity_id: string; activity_name: string }>;

        // Mock R2Service to return existing cached emojis
        const existingCachedEmojis = {
          'existing-activity': '📚',
        };
        R2ServiceMock.getJsonFromBucket.mockResolvedValue(existingCachedEmojis);

        // Mock OpenAI to return a valid emoji
        OpenAIServiceMock.generateEmojiForActivity.mockResolvedValue('🏃‍♂️');

        // Mock activity repository
        ActivityRepositoryMock.orm.findOne.mockResolvedValue({
          id: 'test-activity-id',
          activity_data: {
            name: 'new-activity',
            habit_icon: '',
          },
        } as any);

        await emojiGenerationConsumer.generateActivityEmoji(mockJobForCaching);

        // Verify that the new emoji was added to the existing cache
        expect(R2ServiceMock.addObjectToBucket).toHaveBeenCalledWith(S3_BUCKET_EMOJIS, 'activity-emojis', {
          'existing-activity': '📚',
          'new-activity': '🏃‍♂️',
        });
      });
    });
  });
});
