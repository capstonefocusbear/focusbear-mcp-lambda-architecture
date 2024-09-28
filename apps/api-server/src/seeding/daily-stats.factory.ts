import { setSeederFactory } from "typeorm-extension";
import { Faker } from "@faker-js/faker";
import { DailyStats } from "../modules/user/entities/user-daily-stats.entity";

export const DailyStatsFactory = setSeederFactory(DailyStats, (faker: Faker) => {
    const dailyActivity = new DailyStats({
        date_completed: faker.date.past(),
        morning_routine_completion_percentage: faker.number.int({ min: 0, max: 100 }),
        evening_routine_completion_percentage: faker.number.int({ min: 0, max: 100 }),
        focus_modes_completed: faker.number.int({ min: 0, max: 100 }),
        should_recalculate: false
    }, { generateId: true });

    return dailyActivity;
});
