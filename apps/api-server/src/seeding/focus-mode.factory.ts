import { setSeederFactory } from 'typeorm-extension';
import { Faker } from '@faker-js/faker';
import { FocusMode } from '../modules/focus-mode/entities/focus-mode.entity';

export const FocusModeFactory = setSeederFactory(FocusMode, (faker: Faker) => {
  const focusMode = new FocusMode(
    {
      name: faker.helpers.arrayElement([
        'Deep Work',
        'Creative Writing',
        'Code Review',
        'Learning',
        'Meetings',
        'Planning',
      ]),
      allowed_apps: faker.helpers.arrayElements(['VS Code', 'Slack', 'Chrome', 'Notion'], { min: 0, max: 3 }),
      allowed_urls: faker.helpers.arrayElements(['github.com', 'stackoverflow.com'], { min: 0, max: 2 }),
      metadata: {
        isDefault: faker.datatype.boolean(),
      },
    },
    { generateId: true },
  );

  return focusMode;
});
