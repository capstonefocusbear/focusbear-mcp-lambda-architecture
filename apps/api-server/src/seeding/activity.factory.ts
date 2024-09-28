import { Activity } from "../modules/activity/entities/activity.entity";
import { setSeederFactory } from "typeorm-extension";
import { Faker } from "@faker-js/faker";
import { ActivityType } from "../modules/activity/domain/activity-type.enum";
import { LogSummaryType } from "../modules/activity/domain/log-summary-type.enum";

export const ActivityFactory = setSeederFactory(Activity, (faker: Faker) => {
    const activity = new Activity({
        type: faker.helpers.arrayElement(Object.values(ActivityType)),
        log_summary_type: LogSummaryType.SUM,
        log_quantity: false,
        duration_seconds: faker.number.int({ min: 60, max: 3600 }),
        activity_data: null,
        created_at: faker.date.past().toISOString(),
        updated_at: faker.date.recent().toISOString(),
        parent_id: null,
        has_choices: false,
        activity_template_id: null,
        is_default: true,
    }, { generateId: true });

    return activity;
});
