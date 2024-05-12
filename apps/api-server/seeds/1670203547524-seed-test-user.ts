import { MigrationInterface, QueryRunner } from 'typeorm';

export class seedTestUser1670203547524 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        INSERT INTO "users" 
            ("id", "auth0_id", "email", "name", "startup_time", 
            "shutdown_time", "break_after_minutes", "current_focus_mode_finish_time", 
            "password_for_settings", "is_office_mode_activated", "created_at", "updated_at", "current_activity_sequence_id", 
            "current_focus_mode_id", "current_activity_id", "current_completing_focus_block_id", "member_of_team_id", 
            "owner_of_team_id", "local_device_settings", "stripe_customer_id", "current_activity_assigned_at", 
            "last_completed_sequence_at", "last_completed_sequence_id", "current_sequence_started_at", 
            "last_completed_sequence_started_at", "current_completing_sequence_log_id", "user_type", "signed_up_via_habit_pack", 
            "current_sequence_skipped_activities", "timezone", "has_edited_settings") 
        VALUES
            ('2636a216-f363-493e-aeb8-d275a0a9016d', 'auth0|643ca25c983376898fcd5028', 
            'zEwDMbs+fKA556CEaQjS8ZcSu/VG7wdkRQrAWc0e12Gwv++qSiiPA/64Je08JbmO', 
            'pbQ4esI/wr+1PwhixDe1xyxqQp3XIaeG6znG4057cymHYcSazrAQF0k/DrGWVUwT', '05:15', '20:30', 15, NULL, NULL, NULL, '2022-12-04 03:54:15.672475+00', 
            '2022-12-04 03:54:15.672475+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cus_Nj9H342KvxDgbj', NULL, '2022-12-04 04:35:34.415+00', NULL, NULL, 
            '2022-12-04 04:35:31.042+00', NULL, 'STANDARD', NULL, NULL, 'UTC', '0')
        ON CONFLICT ("id") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DELETE FROM "users" WHERE id = '2636a216-f363-493e-aeb8-d275a0a9016d';
    `);
  }
}
