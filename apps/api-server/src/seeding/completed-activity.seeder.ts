import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { CompletedActivity } from '../modules/activity/entities/completed-activity.entity';
import { Activity } from '../modules/activity/entities/activity.entity';
import { ActivitySequence } from '../modules/activity/entities/activity-sequence.entity';
import { ONE_HOUR_MILLISECONDS, ONE_DAY_MILLISECONDS } from '../shared/utils/constants';
import {
  TEST_USER_ID,
  TEST_MORNING_ACTIVITY_ID,
  TEST_EVENING_ACTIVITY_ID,
  TEST_MORNING_ACTIVITY_SEQUENCE_ID,
  TEST_EVENING_ACTIVITY_SEQUENCE_ID,
  TEST_COMPLETED_ACTIVITY_ID,
} from './seeding-constant';

export class CompletedActivitySeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<void> {
    const completedActivityFactory = factoryManager.get(CompletedActivity);
    const completedActivityRepository = dataSource.getRepository(CompletedActivity);
    const activityRepository = dataSource.getRepository(Activity);
    const activitySequenceRepository = dataSource.getRepository(ActivitySequence);

    // Get test activities and sequences
    const morningActivity = await activityRepository.findOne({
      where: { id: TEST_MORNING_ACTIVITY_ID },
    });
    const eveningActivity = await activityRepository.findOne({
      where: { id: TEST_EVENING_ACTIVITY_ID },
    });
    const morningSequence = await activitySequenceRepository.findOne({
      where: { id: TEST_MORNING_ACTIVITY_SEQUENCE_ID },
    });
    const eveningSequence = await activitySequenceRepository.findOne({
      where: { id: TEST_EVENING_ACTIVITY_SEQUENCE_ID },
    });

    if (!morningActivity || !eveningActivity || !morningSequence || !eveningSequence) {
      // eslint-disable-next-line no-console
      console.warn('Test activities or sequences not found. Skipping completed activity seeding.');
      return;
    }

    const now = new Date();

    // 1. Recent completed activities (within last 24 hours) - for default query testing
    const oneHourAgo = new Date(now.getTime() - 1 * ONE_HOUR_MILLISECONDS);
    const twoHoursAgo = new Date(now.getTime() - 2 * ONE_HOUR_MILLISECONDS);
    const threeHoursAgo = new Date(now.getTime() - 3 * ONE_HOUR_MILLISECONDS);

    const activity1 = await completedActivityFactory.save({
      id: TEST_COMPLETED_ACTIVITY_ID,
      user_id: TEST_USER_ID,
      activity_id: morningActivity.id,
      activity_sequence_id: morningSequence.id,
      start_time: threeHoursAgo,
      finish_time: twoHoursAgo,
      duration_logged: 3600,
      activity_note: 'Great meditation session today!',
      metadata: {
        is_skipped: false,
        skipped_did_not_complete: false,
        skipped_did_complete: false,
      },
    });
    await completedActivityRepository.save(activity1);

    const activity2 = await completedActivityFactory.save({
      user_id: TEST_USER_ID,
      activity_id: eveningActivity.id,
      activity_sequence_id: eveningSequence.id,
      start_time: twoHoursAgo,
      finish_time: oneHourAgo,
      duration_logged: 1800,
      activity_note: 'Reflected on the day and set intentions for tomorrow.',
      metadata: {
        is_skipped: false,
        skipped_did_not_complete: false,
        skipped_did_complete: false,
      },
    });
    await completedActivityRepository.save(activity2);

    const activity3 = await completedActivityFactory.save({
      user_id: TEST_USER_ID,
      activity_id: morningActivity.id,
      activity_sequence_id: morningSequence.id,
      start_time: oneHourAgo,
      finish_time: now,
      duration_logged: 1200,
      // No note for this one - testing notes filtering
      metadata: {
        is_skipped: false,
        skipped_did_not_complete: false,
        skipped_did_complete: false,
      },
    });
    await completedActivityRepository.save(activity3);

    // 2. Older completed activities (outside last 24 hours) - for time range testing
    const twoDaysAgo = new Date(now.getTime() - 2 * ONE_DAY_MILLISECONDS);
    const threeDaysAgo = new Date(now.getTime() - 3 * ONE_DAY_MILLISECONDS);
    const fourDaysAgo = new Date(now.getTime() - 4 * ONE_DAY_MILLISECONDS);

    const activity4 = await completedActivityFactory.save({
      user_id: TEST_USER_ID,
      activity_id: eveningActivity.id,
      activity_sequence_id: eveningSequence.id,
      start_time: fourDaysAgo,
      finish_time: threeDaysAgo,
      duration_logged: 2400,
      activity_note: 'Completed evening routine with gratitude practice.',
      metadata: {
        is_skipped: false,
        skipped_did_not_complete: false,
        skipped_did_complete: false,
      },
    });
    await completedActivityRepository.save(activity4);

    const activity5 = await completedActivityFactory.save({
      user_id: TEST_USER_ID,
      activity_id: morningActivity.id,
      activity_sequence_id: morningSequence.id,
      start_time: threeDaysAgo,
      finish_time: twoDaysAgo,
      duration_logged: 3000,
      activity_note: 'Morning meditation helped me start the day with clarity.',
      metadata: {
        is_skipped: false,
        skipped_did_not_complete: false,
        skipped_did_complete: false,
      },
    });
    await completedActivityRepository.save(activity5);

    // 3. Activities with different durations - for testing various scenarios
    const activity6 = await completedActivityFactory.save({
      user_id: TEST_USER_ID,
      activity_id: eveningActivity.id,
      activity_sequence_id: eveningSequence.id,
      start_time: new Date(now.getTime() - 5 * ONE_HOUR_MILLISECONDS),
      finish_time: new Date(now.getTime() - 4 * ONE_HOUR_MILLISECONDS),
      duration_logged: 600,
      activity_note: 'Quick 10-minute reflection.',
      metadata: {
        is_skipped: false,
        skipped_did_not_complete: false,
        skipped_did_complete: false,
      },
    });
    await completedActivityRepository.save(activity6);

    const activity7 = await completedActivityFactory.save({
      user_id: TEST_USER_ID,
      activity_id: morningActivity.id,
      activity_sequence_id: morningSequence.id,
      start_time: new Date(now.getTime() - 6 * ONE_HOUR_MILLISECONDS),
      finish_time: new Date(now.getTime() - 5 * ONE_HOUR_MILLISECONDS),
      duration_logged: 5400,
      activity_note: 'Extended morning routine with journaling and planning.',
      metadata: {
        is_skipped: false,
        skipped_did_not_complete: false,
        skipped_did_complete: false,
      },
    });
    await completedActivityRepository.save(activity7);

    // 4. More activities for comprehensive testing
    const activity8 = await completedActivityFactory.save({
      user_id: TEST_USER_ID,
      activity_id: eveningActivity.id,
      activity_sequence_id: eveningSequence.id,
      start_time: new Date(now.getTime() - 8 * ONE_HOUR_MILLISECONDS),
      finish_time: new Date(now.getTime() - 7 * ONE_HOUR_MILLISECONDS),
      duration_logged: 1800,
      // No note
      metadata: {
        is_skipped: false,
        skipped_did_not_complete: false,
        skipped_did_complete: false,
      },
    });
    await completedActivityRepository.save(activity8);

    const activity9 = await completedActivityFactory.save({
      user_id: TEST_USER_ID,
      activity_id: morningActivity.id,
      activity_sequence_id: morningSequence.id,
      start_time: new Date(now.getTime() - 10 * ONE_HOUR_MILLISECONDS),
      finish_time: new Date(now.getTime() - 9 * ONE_HOUR_MILLISECONDS),
      duration_logged: 3600,
      activity_note: 'Focused meditation session with breathing exercises.',
      metadata: {
        is_skipped: false,
        skipped_did_not_complete: false,
        skipped_did_complete: false,
      },
    });
    await completedActivityRepository.save(activity9);
  }
}
