import { setSeederFactory } from 'typeorm-extension';
import { Faker } from '@faker-js/faker';
import { ActivityTemplate } from '../modules/activity-template/entity/activity-template.entity';
import { LogSummaryType } from '../modules/activity/domain/log-summary-type.enum';
import { ActivityType } from '../modules/activity/domain/activity-type.enum';

export const ActivityTemplateFactory = setSeederFactory(ActivityTemplate, (faker: Faker) => {
  const activityTemplate = new ActivityTemplate({
    activity_type: faker.helpers.arrayElement(Object.values(ActivityType)),
    log_summary_type: LogSummaryType.SUM,
    log_quantity: false,
    activity_data: {
      name: faker.lorem.words(3),
      video_urls: ['https://www.youtube.com/watch?v=36mnXAQGRzc'],
      allowed_apps: [],
      allowed_urls: [],
    },
    has_choices: false,
    duration_seconds: faker.number.int({ min: 60, max: 3600 }),
    completion_requirements: null,
    parent_id: null,
    linked_activity_template_id: null,
    sequence_index: 1,
    impact_category: null,
    deleted_at: null,
  });

  return activityTemplate;
});
