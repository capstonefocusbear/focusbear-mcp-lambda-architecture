import { InjectQueue } from '@nestjs/bull';
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Queue } from 'bull';
import { UserRepository } from '../../../user/repositories/user.repository';
import { ActivityRepository } from '../../repositories/activity.repository';

@Injectable()
export class ActivityService {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly userRepository: UserRepository,
    @InjectQueue('activity-image') private activityQueue: Queue,
    private readonly activityRepository: ActivityRepository,
  ) {}

  async deleteActivityImageFromUploadIO(user_id: string, filePath: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Adding activity image path name to queue',
        data: {
          user_id,
          filePath,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) {
        throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
      }
      const activityId = filePath.split('/')[3];
      const existingActivity = await this.activityRepository.orm.findOneBy({ id: activityId });
      if (existingActivity.user_id !== user_id) {
        throw new UnauthorizedException(
          `User with ID: ${user_id} is not authorized to delete this image from activity with ID: ${activityId}`,
        );
      }
      await this.activityQueue.add('delete-activity-image', {
        user_id,
        filePath,
      });
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }
}
