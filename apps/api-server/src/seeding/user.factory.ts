import { User } from "../modules/user/entities/user.entity";
import { setSeederFactory } from "typeorm-extension";
import { Faker } from "@faker-js/faker";
import { v4 as uuidv4 } from 'uuid';
import { UserTypes } from "../modules/user/domain/user-types.enum";
import { UpdateLocalDeviceSettingsDto } from "../modules/user/dto/update-local-device-settings.dto";

export const UserFactory = setSeederFactory(User, (faker: Faker) => {
    const user = new User({}, { generateId: true });

    user.created_at = faker.date.recent().toISOString();
    user.updated_at = faker.date.recent().toISOString();
    user.auth0_id = uuidv4();
    user.username = faker.person.fullName();
    user.startup_time = faker.date.recent().toISOString();
    user.shutdown_time = faker.date.future().toISOString();
    user.break_after_minutes = faker.number.int({ min: 30, max: 120 });
    user.current_focus_mode_finish_time = faker.date.future();
    user.password_for_settings = faker.internet.password();
    user.is_office_mode_activated = faker.datatype.boolean();
    user.current_activity_sequence_id = null;
    user.current_focus_mode_id = null;
    user.current_activity_id = null;
    user.current_completing_focus_block_id = null;
    user.local_device_settings = new UpdateLocalDeviceSettingsDto();
    user.stripe_customer_id = `cus_${faker.string.alphanumeric(14)}`;
    user.current_activity_assigned_at = faker.date.recent();
    user.last_completed_sequence_at = faker.date.past();
    user.last_completed_sequence_id = null;
    user.current_sequence_started_at = faker.date.recent();
    user.last_completed_sequence_started_at = faker.date.past();
    user.current_completing_sequence_log_id = null;
    user.user_type = faker.helpers.arrayElement(Object.values(UserTypes));
    user.signed_up_via_habit_pack = null;
    user.current_sequence_skipped_activities = [];
    user.timezone = "UTC";
    user.has_edited_settings = faker.datatype.boolean();
    user.num_days_of_stats = faker.number.int({ min: 5, max: 20 });
    user.morning_percent_number_day_of_stats_completed = faker.number.int({ min: 1, max: 100 });
    user.evening_percent_number_day_of_stats_completed = faker.number.int({ min: 1, max: 100 });
    user.morning_routines_streak = faker.number.int({ min: 0, max: 50 });
    user.evening_routines_streak = faker.number.int({ min: 0, max: 50 });

    return user;
});
