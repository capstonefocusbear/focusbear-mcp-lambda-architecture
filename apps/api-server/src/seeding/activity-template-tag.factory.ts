import { setSeederFactory } from 'typeorm-extension';
import { Faker } from '@faker-js/faker';
import { ActivityTemplateTag } from '../modules/activity-template/entity/activity-template-tag.entity';
import { TEST_Tags } from './seeding-constant';

export const ActivityTemplateTagFactory = setSeederFactory(ActivityTemplateTag, (faker: Faker) => {
  const activityTemplateTag = new ActivityTemplateTag({
    tags: faker.helpers.arrayElements(TEST_Tags, 1),
  });

  return activityTemplateTag;
});
