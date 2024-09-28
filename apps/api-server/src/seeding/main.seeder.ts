import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { User } from '../modules/user/entities/user.entity';
import { Activity } from '../modules/activity/entities/activity.entity';
import { DailyStats } from '../modules/user/entities/user-daily-stats.entity';
import { ActivitySequence } from '../modules/activity/entities/activity-sequence.entity';
import { ActivityType } from '../modules/activity/domain/activity-type.enum';
import { ActivityPriority } from '../modules/activity/domain/activity-priority.enum';
import { ActivityData } from '../modules/activity/domain/activity-data.model';
import { Device } from '../modules/device/entities/device.entity';
import { randomInt } from 'crypto';
import {
    TEST_USER_ID, TEST_MORNING_ACTIVITY_SEQUENCE_ID, TEST_MORNING_ACTIVITY_ID,
    TEST_EVENING_ACTIVITY_SEQUENCE_ID, TEST_EVENING_ACTIVITY_ID, TEST_DEVICE_ID
} from './seeding-constant';

export class MainSeeder implements Seeder {
    public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<void> {
        const userFactory = factoryManager.get(User);
        const users = await userFactory.saveMany(100);
        const activitySequenceFactory = factoryManager.get(ActivitySequence);
        const activityFactory = factoryManager.get(Activity);
        const dailyStatsFactory = factoryManager.get(DailyStats);
        const deviceFactory = factoryManager.get(Device);
        const activityPromises = [];
        const dailyStatsPromises = [];
        const devicePromises = [];
        const activitySequencePromises = [];

        for (const user of users) {
            devicePromises.push(deviceFactory.save({
                user_id: user.id,
            }));

            // Create and save activity sequences first
            activitySequencePromises.push(activitySequenceFactory.save({
                user_id: user.id,
                type: ActivityType.morning,
                activity_ids: [],
                total_duration_seconds: 200
            }));

            activitySequencePromises.push(activitySequenceFactory.save({
                user_id: user.id,
                type: ActivityType.evening,
                activity_ids: [],
                total_duration_seconds: 200
            }));
        }

        // Wait for all activity sequences to be created
        const activitySequences = await Promise.all(activitySequencePromises);

        // Now create activities using the saved sequence IDs
        for (const [index, user] of users.entries()) {
            const randomNumber = randomInt(0, 101);

            activityPromises.push(activityFactory.saveMany(randomNumber, {
                user_id: user.id,
                activity_sequence_id: activitySequences[index * 2].id, // Morning sequence
                type: ActivityType.morning
            }));

            activityPromises.push(activityFactory.saveMany(randomNumber, {
                user_id: user.id,
                activity_sequence_id: activitySequences[index * 2 + 1].id, // Evening sequence
                type: ActivityType.evening
            }));

            dailyStatsPromises.push(dailyStatsFactory.saveMany(user.num_days_of_stats, {
                user_id: user.id,
            }));
        }

        // Wait for all activities and daily stats to be created
        await Promise.all([...activityPromises, ...dailyStatsPromises]);

        // create dummy data for backendTestUser
        await userFactory.save({
            id: TEST_USER_ID,
            username: 'testuser',
            num_days_of_stats: 30,
        });

        const activitySequence = await activitySequenceFactory.save({
            user_id: TEST_USER_ID,
            id: TEST_MORNING_ACTIVITY_SEQUENCE_ID, // Use constant
            type: ActivityType.morning,
            activity_ids: [TEST_MORNING_ACTIVITY_ID], // Use constant
            total_duration_seconds: 780,
        });

        await activityFactory.save({
            user_id: TEST_USER_ID,
            id: TEST_MORNING_ACTIVITY_ID, // Use constant
            activity_sequence_id: activitySequence.id,
            type: ActivityType.morning,
            activity_data: new ActivityData({
                name: 'Test Activity',
                text_instructions: 'This is a test activity',
                category: 'Test Category',
                priority: ActivityPriority.STANDARD,
                is_office_friendly: true,
            })
        });

        const activitySequenceEvening = await activitySequenceFactory.save({
            user_id: TEST_USER_ID,
            id: TEST_EVENING_ACTIVITY_SEQUENCE_ID, // Use constant
            type: ActivityType.evening,
            activity_ids: [TEST_EVENING_ACTIVITY_ID], // Use constant
            total_duration_seconds: 780,
        });

        await activityFactory.save({
            user_id: TEST_USER_ID,
            id: TEST_EVENING_ACTIVITY_ID, // Use constant
            activity_sequence_id: activitySequenceEvening.id,
            type: ActivityType.evening,
            activity_data: new ActivityData({
                name: 'Test Activity',
                text_instructions: 'This is a test activity',
                category: 'Test Category',
                priority: ActivityPriority.STANDARD,
                is_office_friendly: true,
            })
        });

        await deviceFactory.save({
            user_id: TEST_USER_ID,
            id: TEST_DEVICE_ID // Use constant
        });

        await dailyStatsFactory.saveMany(30, {
            user_id: TEST_USER_ID,
        });
    }
}
