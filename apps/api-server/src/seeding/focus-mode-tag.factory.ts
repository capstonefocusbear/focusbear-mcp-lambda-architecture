import { setSeederFactory } from 'typeorm-extension';
import { Faker } from '@faker-js/faker';
import { FocusModeTag } from '../modules/focus-mode/entities/focus-mode-tags';
import { TEST_Tags } from './seeding-constant';

export const FocusModeTagFactory = setSeederFactory(FocusModeTag, (faker: Faker) => {
  const focusModeTag = new FocusModeTag(
    {
      text: faker.helpers.arrayElement(TEST_Tags),
    },
    { generateId: true },
  );

  return focusModeTag;
});
