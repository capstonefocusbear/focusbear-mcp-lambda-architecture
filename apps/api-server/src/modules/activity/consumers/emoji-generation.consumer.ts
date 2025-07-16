import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import { OpenAIService } from '@app/openai';
import { R2Service } from '@app/r2';
import { ActivityRepository } from '../repositories/activity.repository';
import { BullQueues, BullWorkers, S3_BUCKET_EMOJIS } from '../../../shared/utils/constants';

@Processor(BullQueues.EMOJI_GENERATION)
export class EmojiGenerationConsumer {
  private readonly S3_KEY = 'activity-emojis';

  private activityEmojis: Record<string, string> = {};

  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly openAIService: OpenAIService,
    private readonly activityRepository: ActivityRepository,
    private readonly r2Service: R2Service,
  ) {}

  @Process(BullWorkers.GENERATE_ACTIVITY_EMOJI)
  async generateActivityEmoji(job: Job<{ activity_id: string; activity_name: string }>) {
    const {
      data: { activity_id, activity_name },
    } = job;

    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Generating emoji for activity using OpenAI',
        data: {
          activity_id,
          activity_name,
        },
      });
      const cachedEmoji = await this.getCachedEmoji(activity_name);

      const emoji = cachedEmoji || (await this.generateEmojiWithOpenAI(activity_name));
      if (emoji) {
        await this.updateActivityEmoji(activity_id, emoji);
        this.sentryService.instance().addBreadcrumb({
          category: 'Service',
          level: 'debug',
          message: 'Successfully generated emoji for activity',
          data: {
            activity_id,
            emoji,
          },
        });
      }
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      console.error('💥 [EMOJI QUEUE] Error in emoji generation queue for activity:', activity_id, error);
    }
  }

  private async generateEmojiWithOpenAI(activityName: string): Promise<string | null> {
    try {
      const emoji = await this.openAIService.generateEmojiForActivity(activityName);
      // Validate that the response is actually an emoji
      if (emoji && /\p{Emoji}/u.test(emoji) && emoji.length <= 10) {
        await this.updateS3Emojis(activityName, emoji);
        return emoji;
      }
      return null;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      return null;
    }
  }

  private async getCachedEmoji(activityName: string): Promise<string | null> {
    const cachedEmojis = await this.r2Service.getJsonFromBucket(S3_BUCKET_EMOJIS, this.S3_KEY);

    this.activityEmojis = cachedEmojis || {};
    // Check if the activity exists in cached emojis
    if (!cachedEmojis || !cachedEmojis[activityName]) {
      return null;
    }

    const emojiData = cachedEmojis[activityName];
    return emojiData;
  }

  private async updateS3Emojis(activityName: string, emoji: string): Promise<void> {
    try {
      this.activityEmojis[activityName] = emoji;
      await this.r2Service.addObjectToBucket(S3_BUCKET_EMOJIS, this.S3_KEY, this.activityEmojis);
    } catch (error) {
      console.error('💥 [EMOJI QUEUE] Error updating S3 emojis:', error);
    }
  }

  private async updateActivityEmoji(activityId: string, emoji: string): Promise<void> {
    try {
      const activity = await this.activityRepository.orm.findOne({
        where: { id: activityId },
      });

      if (activity && activity.activity_data) {
        // Update the habit_icon in the activity_data
        const updatedActivityData = {
          ...activity.activity_data,
          habit_icon: emoji,
        };

        await this.activityRepository.orm.update(activityId, {
          activity_data: updatedActivityData,
        });
      }
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }
}
