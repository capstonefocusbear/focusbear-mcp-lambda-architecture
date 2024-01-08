import { ConflictException, Injectable } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { DAYS_OF_WEEK } from '../../../../../../../cron-jobs/user-stats-cron-job/constants';
import { ActivityType } from '../../domain/activity-type.enum';
import { DailySequenceDurations } from '../../domain/daily-sequence-durations.model';
import { DaysOfWeek } from '../../domain/days-of-week.enum';
import { Activity } from '../../entities/activity.entity';
import { ActivityRepository } from '../../repositories/activity.repository';

@Injectable()
export class ActivitySequenceService {
  constructor(
    private readonly activityRepository: ActivityRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  filterActivitiesForCurrentDay(currentDay: DaysOfWeek, activities: Activity[]) {
    const activitiesForCurrentDay = activities.filter(
      ({ days_of_week }) => days_of_week.includes(DaysOfWeek.ALL) || days_of_week.includes(currentDay),
    );
    return activitiesForCurrentDay;
  }

  sumDurationOfActivities(activities: Activity[]) {
    return activities.reduce((total, { duration_seconds }) => total + Number(duration_seconds), 0);
  }

  checkIfActivityExistsInSequence(sequenceActivityIds: string[], activityId: string, sequenceId: string) {
    const completedActivityIndexInTheSequence = sequenceActivityIds.findIndex((e) => e === activityId);
    const isInvalidActivityIdForThisSequence = completedActivityIndexInTheSequence === -1;
    const isInvalidActivityIdForThisSequenceMessage = `Activity with id: ${activityId} does not exist in the sequence with id: ${sequenceId}!`;
    if (isInvalidActivityIdForThisSequence) throw new ConflictException(isInvalidActivityIdForThisSequenceMessage);
  }

  // sorts the activities for current day in order they should be executed in
  sortActivityIdsByExecutionSequence(activityIds: string[], unsortedActivities: Activity[]): string[] {
    const activitiesSortedBySequence = activityIds.map((id) => {
      return unsortedActivities.find((activity) => activity.id === id);
    });
    const sortedIds = activitiesSortedBySequence.map((activity) => activity?.id).filter((id) => id !== undefined);
    return sortedIds;
  }

  getSequenceDurationForDay(activities: Activity[], currentDay: DaysOfWeek) {
    const activitiesForCurrentDay = this.filterActivitiesForCurrentDay(currentDay, activities);
    return this.sumDurationOfActivities(activitiesForCurrentDay);
  }

  calculateSequenceDurationForWeek(activities: Activity[]): DailySequenceDurations {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Calculating sequence duration for current day',
      });
      const dailySequenceDurations = {
        MON: 0,
        TUE: 0,
        WED: 0,
        THU: 0,
        FRI: 0,
        SAT: 0,
        SUN: 0,
      };
      DAYS_OF_WEEK.forEach((day) => {
        const sequenceDuration = this.getSequenceDurationForDay(activities, day);
        dailySequenceDurations[day] = sequenceDuration;
      });
      return dailySequenceDurations;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getUserRoutineDailyDurations(user_id: string): Promise<{
    morningRoutineDailyDurations: DailySequenceDurations;
    eveningRoutineDailyDurations: DailySequenceDurations;
  }> {
    const morningActivities = await this.activityRepository.orm.find({
      where: { user_id, type: ActivityType.morning },
    });
    const eveningActivities = await this.activityRepository.orm.find({
      where: { user_id, type: ActivityType.evening },
    });
    const morningRoutineDailyDurations = this.calculateSequenceDurationForWeek(morningActivities);
    const eveningRoutineDailyDurations = this.calculateSequenceDurationForWeek(eveningActivities);
    return { morningRoutineDailyDurations, eveningRoutineDailyDurations };
  }
}
