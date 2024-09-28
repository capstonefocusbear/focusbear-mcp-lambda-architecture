import { setSeederFactory } from "typeorm-extension";
import { ActivitySequence } from "../modules/activity/entities/activity-sequence.entity";

export const ActivitySequenceFactory = setSeederFactory(ActivitySequence, () => {
    const dailyActivity = new ActivitySequence({
        activities: [],
    });

    return dailyActivity;
});
