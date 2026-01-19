import { setSeederFactory } from 'typeorm-extension';
import { Faker } from '@faker-js/faker';
import { CompletedFocusBlock } from '../modules/focus-mode/entities/completed-focus-block.entity';

export const CompletedFocusBlockFactory = setSeederFactory(CompletedFocusBlock, (faker: Faker) => {
  const startTime = faker.date.recent({ days: 7 });
  const durationMinutes = faker.number.int({ min: 5, max: 120 });
  const finishTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  const completedFocusBlock = new CompletedFocusBlock(
    {
      start_time: startTime,
      finish_time: finishTime,
      scheduled_finish_time: finishTime,
      focus_duration_seconds: durationMinutes * 60,
      intention: faker.lorem.sentence(),
      achievements: faker.lorem.sentence(),
      distractions: faker.lorem.sentence(),
      metadata: {
        app_usage: faker.helpers.arrayElements(['VS Code', 'Chrome', 'Slack'], { min: 0, max: 3 }),
        focus_alignment_score: faker.number.int({ min: 1, max: 10 }),
        tab_count: faker.number.int({ min: 1, max: 20 }),
        average_tab_count: Number(faker.number.float({ min: 1, max: 10, fractionDigits: 1 }).toFixed(1)),
        average_tab_duration: faker.number.int({ min: 30, max: 300 }),
      },
    },
    { generateId: true },
  );

  return completedFocusBlock;
});
