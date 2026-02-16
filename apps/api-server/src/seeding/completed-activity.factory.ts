import { setSeederFactory } from 'typeorm-extension';
import { Faker } from '@faker-js/faker';
import { CompletedActivity } from '../modules/activity/entities/completed-activity.entity';

export const CompletedActivityFactory = setSeederFactory(CompletedActivity, (faker: Faker) => {
  const startTime = faker.date.recent({ days: 30 });
  const durationMinutes = faker.number.int({ min: 1, max: 60 });
  const finishTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  const completedActivity = new CompletedActivity(
    {
      start_time: startTime,
      finish_time: finishTime,
      duration_logged: durationMinutes * 60,
      quantity_logged: faker.number.int({ min: 0, max: 100 }),
      activity_note: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
      metadata: faker.helpers.maybe(
        () => ({
          is_skipped: false,
          skipped_did_not_complete: false,
          skipped_did_complete: false,
        }),
        { probability: 0.5 },
      ),
    },
    { generateId: true, log_quantity: false },
  );

  return completedActivity;
});
