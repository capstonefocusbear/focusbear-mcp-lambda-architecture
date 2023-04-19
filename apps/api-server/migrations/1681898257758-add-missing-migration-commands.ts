import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingMigrationCommands1681898257758 implements MigrationInterface {
  name = 'AddMissingMigrationCommands1681898257758';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "daily_stats" DROP CONSTRAINT "daily_stats_user_id_fkey"');
    await queryRunner.query('ALTER TABLE "daily_stats" DROP CONSTRAINT "daily_stats_morning_sequence_log_id_fkey"');
    await queryRunner.query('ALTER TABLE "daily_stats" DROP CONSTRAINT "daily_stats_evening_sequence_log_id_fkey"');
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" DROP CONSTRAINT "completed_activity_sequences_activity_sequence_id_fkey"',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" DROP CONSTRAINT "completed_activity_sequences_user_id_fkey"',
    );
    await queryRunner.query('ALTER TABLE "installed_packs" DROP CONSTRAINT "installed_packs_pack_id_fkey"');
    await queryRunner.query('ALTER TABLE "installed_packs" DROP CONSTRAINT "installed_packs_user_id_fkey"');
    await queryRunner.query(
      'ALTER TABLE "installed_packs" DROP CONSTRAINT "installed_packs_activity_sequence_id_fkey"',
    );
    await queryRunner.query('ALTER TABLE "habit_packs" DROP CONSTRAINT "habit_packs_user_id_fkey"');
    await queryRunner.query('ALTER TABLE "activity_template" DROP CONSTRAINT "activity_template_pack_id_fkey"');
    await queryRunner.query('ALTER TABLE "activity_template" DROP CONSTRAINT "activity_template_user_id_fkey"');
    await queryRunner.query('ALTER TABLE "activity_template" DROP CONSTRAINT "activity_template_parent_id_fkey"');
    await queryRunner.query(
      'ALTER TABLE "completed_activities" DROP CONSTRAINT "completed_activities_activity_sequence_id_fkey"',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activities" DROP CONSTRAINT "completed_activities_activity_id_fkey"',
    );
    await queryRunner.query('ALTER TABLE "completed_activities" DROP CONSTRAINT "completed_activities_user_id_fkey"');
    await queryRunner.query(
      'ALTER TABLE "completed_activities" DROP CONSTRAINT "completed_activities_completed_sequence_id_fkey"',
    );
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "activities_activity_sequence_id_fkey"');
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "activities_parent_id_fkey"');
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "activities_activity_template_id_fkey"');
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "activities_user_id_fkey"');
    await queryRunner.query('ALTER TABLE "devices" DROP CONSTRAINT "devices_user_id_fkey"');
    await queryRunner.query(
      'ALTER TABLE "installed_focus_mode_templates" DROP CONSTRAINT "installed_focus_mode_templates_user_id_fkey"',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_focus_mode_templates" DROP CONSTRAINT "installed_focus_mode_templates_focus_mode_template_id_fkey"',
    );
    await queryRunner.query('ALTER TABLE "focus_mode_templates" DROP CONSTRAINT "FK_219ca4ea35a2fb153fefd0ce27a"');
    await queryRunner.query(
      'ALTER TABLE "completed_focus_blocks" DROP CONSTRAINT "completed_focus_blocks_user_id_fkey"',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_focus_blocks" DROP CONSTRAINT "completed_focus_blocks_focus_mode_id_fkey"',
    );
    await queryRunner.query('ALTER TABLE "focus_modes" DROP CONSTRAINT "focus_modes_user_id_fkey"');
    await queryRunner.query('ALTER TABLE "focus_modes" DROP CONSTRAINT "focus_modes_focus_mode_template_id_fkey"');
    await queryRunner.query('ALTER TABLE "teams" DROP CONSTRAINT "teams_owner_id_fkey"');
    await queryRunner.query('ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_fkey"');
    await queryRunner.query('ALTER TABLE "user_consent" DROP CONSTRAINT "user_consent_user_id_fkey"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "users_current_activity_sequence_id_fkey"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "users_current_focus_mode_id_fkey"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "users_current_activity_id_fkey"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "users_current_completing_focus_block_id_fkey"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "users_member_of_team_id_fkey"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "users_owner_of_team_id_fkey"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "users_last_completed_sequence_id_fkey"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "users_current_completing_sequence_log_id_fkey"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "users_signed_up_via_habit_pack_fkey"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "users_signed_up_via_focus_mode_fkey"');
    await queryRunner.query('ALTER TABLE "activity_sequences" DROP CONSTRAINT "activity_sequences_pack_id_fkey"');
    await queryRunner.query('ALTER TABLE "activity_sequences" DROP CONSTRAINT "activity_sequences_user_id_fkey"');
    await queryRunner.query('ALTER TABLE "course_ratings" DROP CONSTRAINT "course_ratings_user_id_fkey"');
    await queryRunner.query('ALTER TABLE "course_ratings" DROP CONSTRAINT "course_ratings_course_id_fkey"');
    await queryRunner.query('ALTER TABLE "course_ratings" DROP CONSTRAINT "course_ratings_lesson_id_fkey"');
    await queryRunner.query('ALTER TABLE "lessons" DROP CONSTRAINT "lessons_course_id_fkey"');
    await queryRunner.query('ALTER TABLE "courses" DROP CONSTRAINT "courses_author_id_fkey"');
    await queryRunner.query('ALTER TABLE "course_enrolments" DROP CONSTRAINT "course_enrolments_course_id_fkey"');
    await queryRunner.query('ALTER TABLE "course_enrolments" DROP CONSTRAINT "course_enrolments_user_id_fkey"');
    await queryRunner.query(
      'ALTER TABLE "admin_access_requests" DROP CONSTRAINT "admin_access_requests_admin_user_id_fkey"',
    );
    await queryRunner.query('DROP INDEX "public"."daily_stats_user_id_idx"');
    await queryRunner.query('DROP INDEX "public"."completed_activity_sequences_activity_sequence_id_idx"');
    await queryRunner.query('DROP INDEX "public"."completed_activity_sequences_user_id_idx"');
    await queryRunner.query('DROP INDEX "public"."completed_activity_sequences_start_time_idx"');
    await queryRunner.query('DROP INDEX "public"."completed_activity_sequences_finish_time_idx"');
    await queryRunner.query('DROP INDEX "public"."installed_packs_user_id_idx"');
    await queryRunner.query('DROP INDEX "public"."installed_packs_pack_id_idx"');
    await queryRunner.query('DROP INDEX "public"."installed_packs_activity_sequence_id_idx"');
    await queryRunner.query('DROP INDEX "public"."habit_packs_user_id_idx"');
    await queryRunner.query('DROP INDEX "public"."activity_template_user_id_idx"');
    await queryRunner.query('DROP INDEX "public"."activity_template_pack_id_idx"');
    await queryRunner.query('DROP INDEX "public"."completed_activities_activity_sequence_id_idx"');
    await queryRunner.query('DROP INDEX "public"."completed_activities_user_id_idx"');
    await queryRunner.query('DROP INDEX "public"."completed_activities_activity_id_idx"');
    await queryRunner.query('DROP INDEX "public"."completed_activities_start_time_idx"');
    await queryRunner.query('DROP INDEX "public"."completed_activities_finish_time_idx"');
    await queryRunner.query('DROP INDEX "public"."completed_activities_completed_sequence_id_idx"');
    await queryRunner.query('DROP INDEX "public"."activities_user_id_idx"');
    await queryRunner.query('DROP INDEX "public"."activities_activity_sequence_id_idx"');
    await queryRunner.query('DROP INDEX "public"."activities_parent_id_idx"');
    await queryRunner.query('DROP INDEX "public"."activities_parent_id_idx1"');
    await queryRunner.query('DROP INDEX "public"."activities_activity_template_id_idx"');
    await queryRunner.query('DROP INDEX "public"."devices_user_id_idx"');
    await queryRunner.query('DROP INDEX "public"."installed_focus_mode_templates_user_id_idx"');
    await queryRunner.query('DROP INDEX "public"."installed_focus_mode_templates_focus_mode_template_id_idx"');
    await queryRunner.query('DROP INDEX "public"."completed_focus_blocks_user_id_idx"');
    await queryRunner.query('DROP INDEX "public"."completed_focus_blocks_focus_mode_id_idx"');
    await queryRunner.query('DROP INDEX "public"."focus_modes_user_id_idx"');
    await queryRunner.query('DROP INDEX "public"."focus_modes_focus_mode_template_id_idx"');
    await queryRunner.query('DROP INDEX "public"."notifications_user_id_idx"');
    await queryRunner.query('DROP INDEX "public"."user_consent_user_id_idx"');
    await queryRunner.query('DROP INDEX "public"."users_current_activity_sequence_id_idx"');
    await queryRunner.query('DROP INDEX "public"."users_current_focus_mode_id_idx"');
    await queryRunner.query('DROP INDEX "public"."users_current_activity_id_idx"');
    await queryRunner.query('DROP INDEX "public"."users_current_completing_focus_block_id_idx"');
    await queryRunner.query('DROP INDEX "public"."users_member_of_team_id_idx"');
    await queryRunner.query('DROP INDEX "public"."users_owner_of_team_id_idx"');
    await queryRunner.query('DROP INDEX "public"."users_last_completed_sequence_id_idx"');
    await queryRunner.query('DROP INDEX "public"."users_current_completing_sequence_log_id_idx"');
    await queryRunner.query('DROP INDEX "public"."users_signed_up_via_habit_pack_idx"');
    await queryRunner.query('DROP INDEX "public"."users_signed_up_via_focus_mode_idx"');
    await queryRunner.query('DROP INDEX "public"."activity_sequences_user_id_idx"');
    await queryRunner.query('DROP INDEX "public"."activity_sequences_type_user_id_idx"');
    await queryRunner.query('DROP INDEX "public"."activity_sequences_pack_id_idx"');
    await queryRunner.query('DROP INDEX "public"."course_ratings_course_id_idx"');
    await queryRunner.query('DROP INDEX "public"."course_ratings_user_id_idx"');
    await queryRunner.query('DROP INDEX "public"."course_ratings_lesson_id_idx"');
    await queryRunner.query('DROP INDEX "public"."lessons_course_id_idx"');
    await queryRunner.query('DROP INDEX "public"."courses_author_id_idx"');
    await queryRunner.query('DROP INDEX "public"."course_enrolments_course_id_idx"');
    await queryRunner.query('DROP INDEX "public"."course_enrolments_user_id_idx"');
    await queryRunner.query('DROP INDEX "public"."admin_access_requests_admin_user_id_idx"');
    await queryRunner.query('ALTER TABLE "daily_stats" DROP CONSTRAINT "FK_7c09b7133924634d328ea96398e"');
    await queryRunner.query('ALTER TABLE "daily_stats" DROP CONSTRAINT "FK_9e4701008510bb5b9d35d19b931"');
    await queryRunner.query('ALTER TABLE "daily_stats" DROP CONSTRAINT "FK_6460247f9f8fb4af1fed3249008"');
    await queryRunner.query('ALTER TABLE "daily_stats" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "daily_stats" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "daily_stats" ALTER COLUMN "user_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "daily_stats" ALTER COLUMN "date_completed" SET NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ADD CONSTRAINT "UQ_9e4701008510bb5b9d35d19b931" UNIQUE ("morning_sequence_log_id")',
    );
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ADD CONSTRAINT "UQ_6460247f9f8fb4af1fed3249008" UNIQUE ("evening_sequence_log_id")',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" DROP CONSTRAINT "FK_0672e8970f2bdebee79f4268254"',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" DROP CONSTRAINT "FK_cb520c9fab7e274b4bd190f3016"',
    );
    await queryRunner.query('ALTER TABLE "installed_packs" DROP CONSTRAINT "FK_634d333e9adb5d90a96aeffdd46"');
    await queryRunner.query('ALTER TABLE "installed_packs" DROP CONSTRAINT "FK_9c3607b832d303ccf87bcb9f00b"');
    await queryRunner.query('ALTER TABLE "habit_packs" DROP CONSTRAINT "FK_c78642e7a487983c6eef72ab977"');
    await queryRunner.query('ALTER TABLE "activity_template" DROP CONSTRAINT "FK_164ed73d380a84065291f14b587"');
    await queryRunner.query('ALTER TABLE "activity_template" DROP CONSTRAINT "FK_812680d65acf98b56f5ee4d0513"');
    await queryRunner.query('ALTER TABLE "activity_template" DROP CONSTRAINT "FK_b4153d8eb28b96ba7e7456c9dec"');
    await queryRunner.query('ALTER TABLE "completed_activities" DROP CONSTRAINT "FK_8e655b7aaf5014e0cd9d7bc472c"');
    await queryRunner.query('ALTER TABLE "completed_activities" DROP CONSTRAINT "FK_0140c854ae5304f6546171332b6"');
    await queryRunner.query('ALTER TABLE "completed_activities" DROP CONSTRAINT "FK_912820036acd64c083c3f7671b5"');
    await queryRunner.query('ALTER TABLE "completed_activities" DROP CONSTRAINT "FK_275037203433cfef2b5c1e62bd2"');
    await queryRunner.query(
      'ALTER TABLE "completed_activities" DROP CONSTRAINT "unique_index_activity_id_completed_sequence_id"',
    );
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "FK_b82f1d8368dd5305ae7e7e664c2"');
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "FK_797b2408833193b3a5fd0216f42"');
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "FK_62b1bed769a3fa8d7f2bacf948c"');
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "FK_55fe1e1514a9f21cf7e5b46d8b0"');
    await queryRunner.query('ALTER TABLE "devices" DROP CONSTRAINT "FK_5e9bee993b4ce35c3606cda194c"');
    await queryRunner.query(
      'ALTER TABLE "installed_focus_mode_templates" DROP CONSTRAINT "FK_9794613b59be7595599b692c48e"',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_focus_mode_templates" DROP CONSTRAINT "FK_811874df684c60b8720047d86fb"',
    );
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" DROP CONSTRAINT "FK_e07f494fb6be4bd758fd6bcb8d6"');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" DROP CONSTRAINT "FK_1b5cd35b5bdda454fd7ae27b2a9"');
    await queryRunner.query('ALTER TABLE "focus_modes" DROP CONSTRAINT "FK_8c944861e1793cb9a4da0fb04c8"');
    await queryRunner.query('ALTER TABLE "focus_modes" DROP CONSTRAINT "FK_9d1b45fc85df3dab66ecf525e33"');
    await queryRunner.query('ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"');
    await queryRunner.query('ALTER TABLE "user_consent" DROP CONSTRAINT "FK_4174e45dd98eb587c2348b8ca1d"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_b4bcb4a59eaf7d5eeab66682cdd"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_975fdeac7998e0b535c84097a65"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_0dbd1834dcec5ba6da8c3810821"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_09abc56892304e353d620ee5e96"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_571efd35d4486a3d8d876bd9f78"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_bcd06c006e1f409075f80acb73a"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_3c961ad87ee0cde19655b01c61b"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_24f35ae7290dee881590641795d"');
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "UQ_b4bcb4a59eaf7d5eeab66682cdd" UNIQUE ("current_activity_sequence_id")',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "UQ_975fdeac7998e0b535c84097a65" UNIQUE ("current_focus_mode_id")',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "UQ_0dbd1834dcec5ba6da8c3810821" UNIQUE ("current_activity_id")',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "UQ_09abc56892304e353d620ee5e96" UNIQUE ("last_completed_sequence_id")',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "UQ_571efd35d4486a3d8d876bd9f78" UNIQUE ("current_completing_sequence_log_id")',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "UQ_3c961ad87ee0cde19655b01c61b" UNIQUE ("owner_of_team_id")',
    );
    await queryRunner.query(
      'ALTER TABLE "video_metadata" ADD CONSTRAINT "UQ_601cdb0e334e8838bfc0c59ca22" UNIQUE ("id")',
    );
    await queryRunner.query('ALTER TABLE "course_ratings" DROP CONSTRAINT "FK_01519cb0eb5e5a294938c012ef1"');
    await queryRunner.query('ALTER TABLE "course_ratings" DROP CONSTRAINT "FK_32b68ae69d8fb9200a854d6b331"');
    await queryRunner.query('ALTER TABLE "course_ratings" DROP CONSTRAINT "FK_11de9f47587474cafc98f3223dd"');
    await queryRunner.query(
      'ALTER TABLE "course_ratings" ADD CONSTRAINT "UQ_32b68ae69d8fb9200a854d6b331" UNIQUE ("course_id")',
    );
    await queryRunner.query('ALTER TABLE "lessons" DROP CONSTRAINT "FK_3c4e299cf8ed04093935e2e22fe"');
    await queryRunner.query('ALTER TABLE "courses" DROP CONSTRAINT "FK_cce7a734fa75f9f3051c50d3283"');
    await queryRunner.query('ALTER TABLE "course_enrolments" DROP CONSTRAINT "FK_ce42bd84fedc0c4024ef19954b3"');
    await queryRunner.query('ALTER TABLE "course_enrolments" DROP CONSTRAINT "FK_96e267f170e2d4ff4eb70b88101"');
    await queryRunner.query('ALTER TABLE "admin_access_requests" DROP CONSTRAINT "FK_7e4952c93107f80cbfb967c9f30"');
    await queryRunner.query('CREATE INDEX "IDX_7c09b7133924634d328ea96398" ON "daily_stats" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_0672e8970f2bdebee79f426825" ON "completed_activity_sequences" ("user_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_cb520c9fab7e274b4bd190f301" ON "completed_activity_sequences" ("activity_sequence_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_71f8be8e436ff3374f45577080" ON "completed_activity_sequences" ("start_time") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_6a9ab2392b0156646f5aaf5979" ON "completed_activity_sequences" ("finish_time") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_634d333e9adb5d90a96aeffdd4" ON "installed_packs" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_9c3607b832d303ccf87bcb9f00" ON "installed_packs" ("pack_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_891274e729f731acec46193365" ON "installed_packs" ("activity_sequence_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_c78642e7a487983c6eef72ab97" ON "habit_packs" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_164ed73d380a84065291f14b58" ON "activity_template" ("pack_id") ');
    await queryRunner.query('CREATE INDEX "IDX_812680d65acf98b56f5ee4d051" ON "activity_template" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_b4153d8eb28b96ba7e7456c9de" ON "activity_template" ("parent_id") ');
    await queryRunner.query('CREATE INDEX "IDX_5789f0af69fb3424d579e3ce40" ON "log_quantity_questions" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_6b4b50fe00a4e9be63f1a38f68" ON "log_quantity_questions" ("activity_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_00d70f5b6839a92c669b552af2" ON "log_quantity_questions" ("activity_template_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_1671b0c5c0d01fe2e372df375d" ON "log_quantity_questions" ("linked_question_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_8dcb6d1db7c348e8d8fa24f737" ON "log_quantity_answers" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_d9a33a0b971780e280c8ca87cc" ON "log_quantity_answers" ("activity_id") ');
    await queryRunner.query('CREATE INDEX "IDX_d70ba16ca89ef16a15870df415" ON "log_quantity_answers" ("question_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_076ce4f4f50997f4eba15e237e" ON "log_quantity_answers" ("completed_activity_log_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_8e655b7aaf5014e0cd9d7bc472" ON "completed_activities" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_0140c854ae5304f6546171332b" ON "completed_activities" ("activity_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_912820036acd64c083c3f7671b" ON "completed_activities" ("activity_sequence_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_cc499e79d9445382ec5410fcce" ON "completed_activities" ("start_time") ');
    await queryRunner.query('CREATE INDEX "IDX_488e154a5a82abcc262c74224c" ON "completed_activities" ("finish_time") ');
    await queryRunner.query('CREATE INDEX "IDX_b82f1d8368dd5305ae7e7e664c" ON "activities" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_797b2408833193b3a5fd0216f4" ON "activities" ("parent_id") ');
    await queryRunner.query('CREATE INDEX "IDX_62b1bed769a3fa8d7f2bacf948" ON "activities" ("activity_template_id") ');
    await queryRunner.query('CREATE INDEX "IDX_55fe1e1514a9f21cf7e5b46d8b" ON "activities" ("activity_sequence_id") ');
    await queryRunner.query('CREATE INDEX "IDX_5e9bee993b4ce35c3606cda194" ON "devices" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_9794613b59be7595599b692c48" ON "installed_focus_mode_templates" ("user_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_811874df684c60b8720047d86f" ON "installed_focus_mode_templates" ("focus_mode_template_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_13b73a21e9033f46dd3ea79641" ON "focus_mode_templates" ("author_id") ');
    await queryRunner.query('CREATE INDEX "IDX_e07f494fb6be4bd758fd6bcb8d" ON "completed_focus_blocks" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_1b5cd35b5bdda454fd7ae27b2a" ON "completed_focus_blocks" ("focus_mode_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_8c944861e1793cb9a4da0fb04c" ON "focus_modes" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_9d1b45fc85df3dab66ecf525e3" ON "focus_modes" ("focus_mode_template_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_9a8a82462cab47c73d25f49261" ON "notifications" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_4174e45dd98eb587c2348b8ca1" ON "user_consent" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_b4bcb4a59eaf7d5eeab66682cd" ON "users" ("current_activity_sequence_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_975fdeac7998e0b535c84097a6" ON "users" ("current_focus_mode_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_16bcf73d1900d2a3061edbeef5" ON "users" ("current_completing_focus_block_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_0dbd1834dcec5ba6da8c381082" ON "users" ("current_activity_id") ');
    await queryRunner.query('CREATE INDEX "IDX_09abc56892304e353d620ee5e9" ON "users" ("last_completed_sequence_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_571efd35d4486a3d8d876bd9f7" ON "users" ("current_completing_sequence_log_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_bcd06c006e1f409075f80acb73" ON "users" ("member_of_team_id") ');
    await queryRunner.query('CREATE INDEX "IDX_3c961ad87ee0cde19655b01c61" ON "users" ("owner_of_team_id") ');
    await queryRunner.query('CREATE INDEX "IDX_24f35ae7290dee881590641795" ON "users" ("signed_up_via_habit_pack") ');
    await queryRunner.query('CREATE INDEX "IDX_82c40e6a1307479d8ee71e0243" ON "users" ("signed_up_via_focus_mode") ');
    await queryRunner.query('CREATE INDEX "IDX_24d5a15c75ddfd0c074f7ed02a" ON "activity_sequences" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_a77fe304c31d49306caacb16db" ON "activity_sequences" ("pack_id") ');
    await queryRunner.query('CREATE INDEX "IDX_01519cb0eb5e5a294938c012ef" ON "course_ratings" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_32b68ae69d8fb9200a854d6b33" ON "course_ratings" ("course_id") ');
    await queryRunner.query('CREATE INDEX "IDX_11de9f47587474cafc98f3223d" ON "course_ratings" ("lesson_id") ');
    await queryRunner.query('CREATE INDEX "IDX_3c4e299cf8ed04093935e2e22f" ON "lessons" ("course_id") ');
    await queryRunner.query('CREATE INDEX "IDX_cce7a734fa75f9f3051c50d328" ON "courses" ("author_id") ');
    await queryRunner.query('CREATE INDEX "IDX_ce42bd84fedc0c4024ef19954b" ON "course_enrolments" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_96e267f170e2d4ff4eb70b8810" ON "course_enrolments" ("course_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_7e4952c93107f80cbfb967c9f3" ON "admin_access_requests" ("admin_user_id") ',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "unique_index_activity_id_completed_sequence_id" UNIQUE ("activity_id", "completed_sequence_id")',
    );
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ADD CONSTRAINT "FK_9e4701008510bb5b9d35d19b931" FOREIGN KEY ("morning_sequence_log_id") REFERENCES "completed_activity_sequences"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ADD CONSTRAINT "FK_6460247f9f8fb4af1fed3249008" FOREIGN KEY ("evening_sequence_log_id") REFERENCES "completed_activity_sequences"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ADD CONSTRAINT "FK_7c09b7133924634d328ea96398e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" ADD CONSTRAINT "FK_0672e8970f2bdebee79f4268254" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" ADD CONSTRAINT "FK_cb520c9fab7e274b4bd190f3016" FOREIGN KEY ("activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_packs" ADD CONSTRAINT "FK_634d333e9adb5d90a96aeffdd46" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_packs" ADD CONSTRAINT "FK_9c3607b832d303ccf87bcb9f00b" FOREIGN KEY ("pack_id") REFERENCES "habit_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "habit_packs" ADD CONSTRAINT "FK_c78642e7a487983c6eef72ab977" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_template" ADD CONSTRAINT "FK_b4153d8eb28b96ba7e7456c9dec" FOREIGN KEY ("parent_id") REFERENCES "activity_template"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_template" ADD CONSTRAINT "FK_164ed73d380a84065291f14b587" FOREIGN KEY ("pack_id") REFERENCES "habit_packs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_template" ADD CONSTRAINT "FK_812680d65acf98b56f5ee4d0513" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "FK_8e655b7aaf5014e0cd9d7bc472c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "FK_0140c854ae5304f6546171332b6" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "FK_912820036acd64c083c3f7671b5" FOREIGN KEY ("activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "FK_275037203433cfef2b5c1e62bd2" FOREIGN KEY ("completed_sequence_id") REFERENCES "completed_activity_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ADD CONSTRAINT "FK_55fe1e1514a9f21cf7e5b46d8b0" FOREIGN KEY ("activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ADD CONSTRAINT "FK_797b2408833193b3a5fd0216f42" FOREIGN KEY ("parent_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ADD CONSTRAINT "FK_b82f1d8368dd5305ae7e7e664c2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ADD CONSTRAINT "FK_62b1bed769a3fa8d7f2bacf948c" FOREIGN KEY ("activity_template_id") REFERENCES "activity_template"("id") ON DELETE NO ACTION ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "devices" ADD CONSTRAINT "FK_5e9bee993b4ce35c3606cda194c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_focus_mode_templates" ADD CONSTRAINT "FK_9794613b59be7595599b692c48e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_focus_mode_templates" ADD CONSTRAINT "FK_811874df684c60b8720047d86fb" FOREIGN KEY ("focus_mode_template_id") REFERENCES "focus_mode_templates"("id") ON DELETE NO ACTION ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_focus_blocks" ADD CONSTRAINT "FK_e07f494fb6be4bd758fd6bcb8d6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_focus_blocks" ADD CONSTRAINT "FK_1b5cd35b5bdda454fd7ae27b2a9" FOREIGN KEY ("focus_mode_id") REFERENCES "focus_modes"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "focus_modes" ADD CONSTRAINT "FK_8c944861e1793cb9a4da0fb04c8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "focus_modes" ADD CONSTRAINT "FK_9d1b45fc85df3dab66ecf525e33" FOREIGN KEY ("focus_mode_template_id") REFERENCES "focus_mode_templates"("id") ON DELETE NO ACTION ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "user_consent" ADD CONSTRAINT "FK_4174e45dd98eb587c2348b8ca1d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_3c961ad87ee0cde19655b01c61b" FOREIGN KEY ("owner_of_team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_bcd06c006e1f409075f80acb73a" FOREIGN KEY ("member_of_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_24f35ae7290dee881590641795d" FOREIGN KEY ("signed_up_via_habit_pack") REFERENCES "habit_packs"("id") ON DELETE NO ACTION ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_0dbd1834dcec5ba6da8c3810821" FOREIGN KEY ("current_activity_id") REFERENCES "activities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_b4bcb4a59eaf7d5eeab66682cdd" FOREIGN KEY ("current_activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_09abc56892304e353d620ee5e96" FOREIGN KEY ("last_completed_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_571efd35d4486a3d8d876bd9f78" FOREIGN KEY ("current_completing_sequence_log_id") REFERENCES "completed_activity_sequences"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_975fdeac7998e0b535c84097a65" FOREIGN KEY ("current_focus_mode_id") REFERENCES "focus_modes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "course_ratings" ADD CONSTRAINT "FK_32b68ae69d8fb9200a854d6b331" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "course_ratings" ADD CONSTRAINT "FK_01519cb0eb5e5a294938c012ef1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "course_ratings" ADD CONSTRAINT "FK_11de9f47587474cafc98f3223dd" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "lessons" ADD CONSTRAINT "FK_3c4e299cf8ed04093935e2e22fe" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "courses" ADD CONSTRAINT "FK_cce7a734fa75f9f3051c50d3283" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "course_enrolments" ADD CONSTRAINT "FK_ce42bd84fedc0c4024ef19954b3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "course_enrolments" ADD CONSTRAINT "FK_96e267f170e2d4ff4eb70b88101" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "admin_access_requests" ADD CONSTRAINT "FK_7e4952c93107f80cbfb967c9f30" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "admin_access_requests" DROP CONSTRAINT "FK_7e4952c93107f80cbfb967c9f30"');
    await queryRunner.query('ALTER TABLE "course_enrolments" DROP CONSTRAINT "FK_96e267f170e2d4ff4eb70b88101"');
    await queryRunner.query('ALTER TABLE "course_enrolments" DROP CONSTRAINT "FK_ce42bd84fedc0c4024ef19954b3"');
    await queryRunner.query('ALTER TABLE "courses" DROP CONSTRAINT "FK_cce7a734fa75f9f3051c50d3283"');
    await queryRunner.query('ALTER TABLE "lessons" DROP CONSTRAINT "FK_3c4e299cf8ed04093935e2e22fe"');
    await queryRunner.query('ALTER TABLE "course_ratings" DROP CONSTRAINT "FK_11de9f47587474cafc98f3223dd"');
    await queryRunner.query('ALTER TABLE "course_ratings" DROP CONSTRAINT "FK_01519cb0eb5e5a294938c012ef1"');
    await queryRunner.query('ALTER TABLE "course_ratings" DROP CONSTRAINT "FK_32b68ae69d8fb9200a854d6b331"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_975fdeac7998e0b535c84097a65"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_571efd35d4486a3d8d876bd9f78"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_09abc56892304e353d620ee5e96"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_b4bcb4a59eaf7d5eeab66682cdd"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_0dbd1834dcec5ba6da8c3810821"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_24f35ae7290dee881590641795d"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_bcd06c006e1f409075f80acb73a"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_3c961ad87ee0cde19655b01c61b"');
    await queryRunner.query('ALTER TABLE "user_consent" DROP CONSTRAINT "FK_4174e45dd98eb587c2348b8ca1d"');
    await queryRunner.query('ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"');
    await queryRunner.query('ALTER TABLE "focus_modes" DROP CONSTRAINT "FK_9d1b45fc85df3dab66ecf525e33"');
    await queryRunner.query('ALTER TABLE "focus_modes" DROP CONSTRAINT "FK_8c944861e1793cb9a4da0fb04c8"');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" DROP CONSTRAINT "FK_1b5cd35b5bdda454fd7ae27b2a9"');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" DROP CONSTRAINT "FK_e07f494fb6be4bd758fd6bcb8d6"');
    await queryRunner.query(
      'ALTER TABLE "installed_focus_mode_templates" DROP CONSTRAINT "FK_811874df684c60b8720047d86fb"',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_focus_mode_templates" DROP CONSTRAINT "FK_9794613b59be7595599b692c48e"',
    );
    await queryRunner.query('ALTER TABLE "devices" DROP CONSTRAINT "FK_5e9bee993b4ce35c3606cda194c"');
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "FK_62b1bed769a3fa8d7f2bacf948c"');
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "FK_b82f1d8368dd5305ae7e7e664c2"');
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "FK_797b2408833193b3a5fd0216f42"');
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "FK_55fe1e1514a9f21cf7e5b46d8b0"');
    await queryRunner.query('ALTER TABLE "completed_activities" DROP CONSTRAINT "FK_275037203433cfef2b5c1e62bd2"');
    await queryRunner.query('ALTER TABLE "completed_activities" DROP CONSTRAINT "FK_912820036acd64c083c3f7671b5"');
    await queryRunner.query('ALTER TABLE "completed_activities" DROP CONSTRAINT "FK_0140c854ae5304f6546171332b6"');
    await queryRunner.query('ALTER TABLE "completed_activities" DROP CONSTRAINT "FK_8e655b7aaf5014e0cd9d7bc472c"');
    await queryRunner.query('ALTER TABLE "activity_template" DROP CONSTRAINT "FK_812680d65acf98b56f5ee4d0513"');
    await queryRunner.query('ALTER TABLE "activity_template" DROP CONSTRAINT "FK_164ed73d380a84065291f14b587"');
    await queryRunner.query('ALTER TABLE "activity_template" DROP CONSTRAINT "FK_b4153d8eb28b96ba7e7456c9dec"');
    await queryRunner.query('ALTER TABLE "habit_packs" DROP CONSTRAINT "FK_c78642e7a487983c6eef72ab977"');
    await queryRunner.query('ALTER TABLE "installed_packs" DROP CONSTRAINT "FK_9c3607b832d303ccf87bcb9f00b"');
    await queryRunner.query('ALTER TABLE "installed_packs" DROP CONSTRAINT "FK_634d333e9adb5d90a96aeffdd46"');
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" DROP CONSTRAINT "FK_cb520c9fab7e274b4bd190f3016"',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" DROP CONSTRAINT "FK_0672e8970f2bdebee79f4268254"',
    );
    await queryRunner.query('ALTER TABLE "daily_stats" DROP CONSTRAINT "FK_7c09b7133924634d328ea96398e"');
    await queryRunner.query('ALTER TABLE "daily_stats" DROP CONSTRAINT "FK_6460247f9f8fb4af1fed3249008"');
    await queryRunner.query('ALTER TABLE "daily_stats" DROP CONSTRAINT "FK_9e4701008510bb5b9d35d19b931"');
    await queryRunner.query(
      'ALTER TABLE "completed_activities" DROP CONSTRAINT "unique_index_activity_id_completed_sequence_id"',
    );
    await queryRunner.query('DROP INDEX "public"."IDX_7e4952c93107f80cbfb967c9f3"');
    await queryRunner.query('DROP INDEX "public"."IDX_96e267f170e2d4ff4eb70b8810"');
    await queryRunner.query('DROP INDEX "public"."IDX_ce42bd84fedc0c4024ef19954b"');
    await queryRunner.query('DROP INDEX "public"."IDX_cce7a734fa75f9f3051c50d328"');
    await queryRunner.query('DROP INDEX "public"."IDX_3c4e299cf8ed04093935e2e22f"');
    await queryRunner.query('DROP INDEX "public"."IDX_11de9f47587474cafc98f3223d"');
    await queryRunner.query('DROP INDEX "public"."IDX_32b68ae69d8fb9200a854d6b33"');
    await queryRunner.query('DROP INDEX "public"."IDX_01519cb0eb5e5a294938c012ef"');
    await queryRunner.query('DROP INDEX "public"."IDX_a77fe304c31d49306caacb16db"');
    await queryRunner.query('DROP INDEX "public"."IDX_24d5a15c75ddfd0c074f7ed02a"');
    await queryRunner.query('DROP INDEX "public"."IDX_82c40e6a1307479d8ee71e0243"');
    await queryRunner.query('DROP INDEX "public"."IDX_24f35ae7290dee881590641795"');
    await queryRunner.query('DROP INDEX "public"."IDX_3c961ad87ee0cde19655b01c61"');
    await queryRunner.query('DROP INDEX "public"."IDX_bcd06c006e1f409075f80acb73"');
    await queryRunner.query('DROP INDEX "public"."IDX_571efd35d4486a3d8d876bd9f7"');
    await queryRunner.query('DROP INDEX "public"."IDX_09abc56892304e353d620ee5e9"');
    await queryRunner.query('DROP INDEX "public"."IDX_0dbd1834dcec5ba6da8c381082"');
    await queryRunner.query('DROP INDEX "public"."IDX_16bcf73d1900d2a3061edbeef5"');
    await queryRunner.query('DROP INDEX "public"."IDX_975fdeac7998e0b535c84097a6"');
    await queryRunner.query('DROP INDEX "public"."IDX_b4bcb4a59eaf7d5eeab66682cd"');
    await queryRunner.query('DROP INDEX "public"."IDX_4174e45dd98eb587c2348b8ca1"');
    await queryRunner.query('DROP INDEX "public"."IDX_9a8a82462cab47c73d25f49261"');
    await queryRunner.query('DROP INDEX "public"."IDX_9d1b45fc85df3dab66ecf525e3"');
    await queryRunner.query('DROP INDEX "public"."IDX_8c944861e1793cb9a4da0fb04c"');
    await queryRunner.query('DROP INDEX "public"."IDX_1b5cd35b5bdda454fd7ae27b2a"');
    await queryRunner.query('DROP INDEX "public"."IDX_e07f494fb6be4bd758fd6bcb8d"');
    await queryRunner.query('DROP INDEX "public"."IDX_13b73a21e9033f46dd3ea79641"');
    await queryRunner.query('DROP INDEX "public"."IDX_811874df684c60b8720047d86f"');
    await queryRunner.query('DROP INDEX "public"."IDX_9794613b59be7595599b692c48"');
    await queryRunner.query('DROP INDEX "public"."IDX_5e9bee993b4ce35c3606cda194"');
    await queryRunner.query('DROP INDEX "public"."IDX_55fe1e1514a9f21cf7e5b46d8b"');
    await queryRunner.query('DROP INDEX "public"."IDX_62b1bed769a3fa8d7f2bacf948"');
    await queryRunner.query('DROP INDEX "public"."IDX_797b2408833193b3a5fd0216f4"');
    await queryRunner.query('DROP INDEX "public"."IDX_b82f1d8368dd5305ae7e7e664c"');
    await queryRunner.query('DROP INDEX "public"."IDX_488e154a5a82abcc262c74224c"');
    await queryRunner.query('DROP INDEX "public"."IDX_cc499e79d9445382ec5410fcce"');
    await queryRunner.query('DROP INDEX "public"."IDX_912820036acd64c083c3f7671b"');
    await queryRunner.query('DROP INDEX "public"."IDX_0140c854ae5304f6546171332b"');
    await queryRunner.query('DROP INDEX "public"."IDX_8e655b7aaf5014e0cd9d7bc472"');
    await queryRunner.query('DROP INDEX "public"."IDX_076ce4f4f50997f4eba15e237e"');
    await queryRunner.query('DROP INDEX "public"."IDX_d70ba16ca89ef16a15870df415"');
    await queryRunner.query('DROP INDEX "public"."IDX_d9a33a0b971780e280c8ca87cc"');
    await queryRunner.query('DROP INDEX "public"."IDX_8dcb6d1db7c348e8d8fa24f737"');
    await queryRunner.query('DROP INDEX "public"."IDX_1671b0c5c0d01fe2e372df375d"');
    await queryRunner.query('DROP INDEX "public"."IDX_00d70f5b6839a92c669b552af2"');
    await queryRunner.query('DROP INDEX "public"."IDX_6b4b50fe00a4e9be63f1a38f68"');
    await queryRunner.query('DROP INDEX "public"."IDX_5789f0af69fb3424d579e3ce40"');
    await queryRunner.query('DROP INDEX "public"."IDX_b4153d8eb28b96ba7e7456c9de"');
    await queryRunner.query('DROP INDEX "public"."IDX_812680d65acf98b56f5ee4d051"');
    await queryRunner.query('DROP INDEX "public"."IDX_164ed73d380a84065291f14b58"');
    await queryRunner.query('DROP INDEX "public"."IDX_c78642e7a487983c6eef72ab97"');
    await queryRunner.query('DROP INDEX "public"."IDX_891274e729f731acec46193365"');
    await queryRunner.query('DROP INDEX "public"."IDX_9c3607b832d303ccf87bcb9f00"');
    await queryRunner.query('DROP INDEX "public"."IDX_634d333e9adb5d90a96aeffdd4"');
    await queryRunner.query('DROP INDEX "public"."IDX_6a9ab2392b0156646f5aaf5979"');
    await queryRunner.query('DROP INDEX "public"."IDX_71f8be8e436ff3374f45577080"');
    await queryRunner.query('DROP INDEX "public"."IDX_cb520c9fab7e274b4bd190f301"');
    await queryRunner.query('DROP INDEX "public"."IDX_0672e8970f2bdebee79f426825"');
    await queryRunner.query('DROP INDEX "public"."IDX_7c09b7133924634d328ea96398"');
    await queryRunner.query(
      'ALTER TABLE "admin_access_requests" ADD CONSTRAINT "FK_7e4952c93107f80cbfb967c9f30" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "course_enrolments" ADD CONSTRAINT "FK_96e267f170e2d4ff4eb70b88101" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "course_enrolments" ADD CONSTRAINT "FK_ce42bd84fedc0c4024ef19954b3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "courses" ADD CONSTRAINT "FK_cce7a734fa75f9f3051c50d3283" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "lessons" ADD CONSTRAINT "FK_3c4e299cf8ed04093935e2e22fe" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query('ALTER TABLE "course_ratings" DROP CONSTRAINT "UQ_32b68ae69d8fb9200a854d6b331"');
    await queryRunner.query(
      'ALTER TABLE "course_ratings" ADD CONSTRAINT "FK_11de9f47587474cafc98f3223dd" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "course_ratings" ADD CONSTRAINT "FK_32b68ae69d8fb9200a854d6b331" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "course_ratings" ADD CONSTRAINT "FK_01519cb0eb5e5a294938c012ef1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query('ALTER TABLE "video_metadata" DROP CONSTRAINT "UQ_601cdb0e334e8838bfc0c59ca22"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "UQ_3c961ad87ee0cde19655b01c61b"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "UQ_571efd35d4486a3d8d876bd9f78"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "UQ_09abc56892304e353d620ee5e96"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "UQ_0dbd1834dcec5ba6da8c3810821"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "UQ_975fdeac7998e0b535c84097a65"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "UQ_b4bcb4a59eaf7d5eeab66682cdd"');
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_24f35ae7290dee881590641795d" FOREIGN KEY ("signed_up_via_habit_pack") REFERENCES "habit_packs"("id") ON DELETE NO ACTION ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_3c961ad87ee0cde19655b01c61b" FOREIGN KEY ("owner_of_team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_bcd06c006e1f409075f80acb73a" FOREIGN KEY ("member_of_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_571efd35d4486a3d8d876bd9f78" FOREIGN KEY ("current_completing_sequence_log_id") REFERENCES "completed_activity_sequences"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_09abc56892304e353d620ee5e96" FOREIGN KEY ("last_completed_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_0dbd1834dcec5ba6da8c3810821" FOREIGN KEY ("current_activity_id") REFERENCES "activities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_975fdeac7998e0b535c84097a65" FOREIGN KEY ("current_focus_mode_id") REFERENCES "focus_modes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_b4bcb4a59eaf7d5eeab66682cdd" FOREIGN KEY ("current_activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "user_consent" ADD CONSTRAINT "FK_4174e45dd98eb587c2348b8ca1d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "focus_modes" ADD CONSTRAINT "FK_9d1b45fc85df3dab66ecf525e33" FOREIGN KEY ("focus_mode_template_id") REFERENCES "focus_mode_templates"("id") ON DELETE NO ACTION ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "focus_modes" ADD CONSTRAINT "FK_8c944861e1793cb9a4da0fb04c8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_focus_blocks" ADD CONSTRAINT "FK_1b5cd35b5bdda454fd7ae27b2a9" FOREIGN KEY ("focus_mode_id") REFERENCES "focus_modes"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_focus_blocks" ADD CONSTRAINT "FK_e07f494fb6be4bd758fd6bcb8d6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_focus_mode_templates" ADD CONSTRAINT "FK_811874df684c60b8720047d86fb" FOREIGN KEY ("focus_mode_template_id") REFERENCES "focus_mode_templates"("id") ON DELETE NO ACTION ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_focus_mode_templates" ADD CONSTRAINT "FK_9794613b59be7595599b692c48e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "devices" ADD CONSTRAINT "FK_5e9bee993b4ce35c3606cda194c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ADD CONSTRAINT "FK_55fe1e1514a9f21cf7e5b46d8b0" FOREIGN KEY ("activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ADD CONSTRAINT "FK_62b1bed769a3fa8d7f2bacf948c" FOREIGN KEY ("activity_template_id") REFERENCES "activity_template"("id") ON DELETE NO ACTION ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ADD CONSTRAINT "FK_797b2408833193b3a5fd0216f42" FOREIGN KEY ("parent_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ADD CONSTRAINT "FK_b82f1d8368dd5305ae7e7e664c2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "unique_index_activity_id_completed_sequence_id" UNIQUE ("activity_id", "completed_sequence_id")',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "FK_275037203433cfef2b5c1e62bd2" FOREIGN KEY ("completed_sequence_id") REFERENCES "completed_activity_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "FK_912820036acd64c083c3f7671b5" FOREIGN KEY ("activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "FK_0140c854ae5304f6546171332b6" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "FK_8e655b7aaf5014e0cd9d7bc472c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_template" ADD CONSTRAINT "FK_b4153d8eb28b96ba7e7456c9dec" FOREIGN KEY ("parent_id") REFERENCES "activity_template"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_template" ADD CONSTRAINT "FK_812680d65acf98b56f5ee4d0513" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_template" ADD CONSTRAINT "FK_164ed73d380a84065291f14b587" FOREIGN KEY ("pack_id") REFERENCES "habit_packs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "habit_packs" ADD CONSTRAINT "FK_c78642e7a487983c6eef72ab977" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_packs" ADD CONSTRAINT "FK_9c3607b832d303ccf87bcb9f00b" FOREIGN KEY ("pack_id") REFERENCES "habit_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_packs" ADD CONSTRAINT "FK_634d333e9adb5d90a96aeffdd46" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" ADD CONSTRAINT "FK_cb520c9fab7e274b4bd190f3016" FOREIGN KEY ("activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" ADD CONSTRAINT "FK_0672e8970f2bdebee79f4268254" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query('ALTER TABLE "daily_stats" DROP CONSTRAINT "UQ_6460247f9f8fb4af1fed3249008"');
    await queryRunner.query('ALTER TABLE "daily_stats" DROP CONSTRAINT "UQ_9e4701008510bb5b9d35d19b931"');
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ADD CONSTRAINT "FK_6460247f9f8fb4af1fed3249008" FOREIGN KEY ("evening_sequence_log_id") REFERENCES "completed_activity_sequences"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ADD CONSTRAINT "FK_9e4701008510bb5b9d35d19b931" FOREIGN KEY ("morning_sequence_log_id") REFERENCES "completed_activity_sequences"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ADD CONSTRAINT "FK_7c09b7133924634d328ea96398e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'CREATE INDEX "admin_access_requests_admin_user_id_idx" ON "admin_access_requests" ("admin_user_id") ',
    );
    await queryRunner.query('CREATE INDEX "course_enrolments_user_id_idx" ON "course_enrolments" ("user_id") ');
    await queryRunner.query('CREATE INDEX "course_enrolments_course_id_idx" ON "course_enrolments" ("course_id") ');
    await queryRunner.query('CREATE INDEX "courses_author_id_idx" ON "courses" ("author_id") ');
    await queryRunner.query('CREATE INDEX "lessons_course_id_idx" ON "lessons" ("course_id") ');
    await queryRunner.query('CREATE INDEX "course_ratings_lesson_id_idx" ON "course_ratings" ("lesson_id") ');
    await queryRunner.query('CREATE INDEX "course_ratings_user_id_idx" ON "course_ratings" ("user_id") ');
    await queryRunner.query('CREATE INDEX "course_ratings_course_id_idx" ON "course_ratings" ("course_id") ');
    await queryRunner.query('CREATE INDEX "activity_sequences_pack_id_idx" ON "activity_sequences" ("pack_id") ');
    await queryRunner.query(
      'CREATE UNIQUE INDEX "activity_sequences_type_user_id_idx" ON "activity_sequences" ("user_id", "type") ',
    );
    await queryRunner.query('CREATE INDEX "activity_sequences_user_id_idx" ON "activity_sequences" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "users_signed_up_via_focus_mode_idx" ON "users" ("signed_up_via_focus_mode") ',
    );
    await queryRunner.query(
      'CREATE INDEX "users_signed_up_via_habit_pack_idx" ON "users" ("signed_up_via_habit_pack") ',
    );
    await queryRunner.query(
      'CREATE INDEX "users_current_completing_sequence_log_id_idx" ON "users" ("current_completing_sequence_log_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "users_last_completed_sequence_id_idx" ON "users" ("last_completed_sequence_id") ',
    );
    await queryRunner.query('CREATE INDEX "users_owner_of_team_id_idx" ON "users" ("owner_of_team_id") ');
    await queryRunner.query('CREATE INDEX "users_member_of_team_id_idx" ON "users" ("member_of_team_id") ');
    await queryRunner.query(
      'CREATE INDEX "users_current_completing_focus_block_id_idx" ON "users" ("current_completing_focus_block_id") ',
    );
    await queryRunner.query('CREATE INDEX "users_current_activity_id_idx" ON "users" ("current_activity_id") ');
    await queryRunner.query('CREATE INDEX "users_current_focus_mode_id_idx" ON "users" ("current_focus_mode_id") ');
    await queryRunner.query(
      'CREATE INDEX "users_current_activity_sequence_id_idx" ON "users" ("current_activity_sequence_id") ',
    );
    await queryRunner.query('CREATE INDEX "user_consent_user_id_idx" ON "user_consent" ("user_id") ');
    await queryRunner.query('CREATE INDEX "notifications_user_id_idx" ON "notifications" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "focus_modes_focus_mode_template_id_idx" ON "focus_modes" ("focus_mode_template_id") ',
    );
    await queryRunner.query('CREATE INDEX "focus_modes_user_id_idx" ON "focus_modes" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "completed_focus_blocks_focus_mode_id_idx" ON "completed_focus_blocks" ("focus_mode_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "completed_focus_blocks_user_id_idx" ON "completed_focus_blocks" ("user_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "installed_focus_mode_templates_focus_mode_template_id_idx" ON "installed_focus_mode_templates" ("focus_mode_template_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "installed_focus_mode_templates_user_id_idx" ON "installed_focus_mode_templates" ("user_id") ',
    );
    await queryRunner.query('CREATE INDEX "devices_user_id_idx" ON "devices" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "activities_activity_template_id_idx" ON "activities" ("activity_template_id") ',
    );
    await queryRunner.query('CREATE INDEX "activities_parent_id_idx1" ON "activities" ("parent_id") ');
    await queryRunner.query('CREATE INDEX "activities_parent_id_idx" ON "activities" ("parent_id") ');
    await queryRunner.query(
      'CREATE INDEX "activities_activity_sequence_id_idx" ON "activities" ("activity_sequence_id") ',
    );
    await queryRunner.query('CREATE INDEX "activities_user_id_idx" ON "activities" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "completed_activities_completed_sequence_id_idx" ON "completed_activities" ("completed_sequence_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "completed_activities_finish_time_idx" ON "completed_activities" ("finish_time") ',
    );
    await queryRunner.query(
      'CREATE INDEX "completed_activities_start_time_idx" ON "completed_activities" ("start_time") ',
    );
    await queryRunner.query(
      'CREATE INDEX "completed_activities_activity_id_idx" ON "completed_activities" ("activity_id") ',
    );
    await queryRunner.query('CREATE INDEX "completed_activities_user_id_idx" ON "completed_activities" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "completed_activities_activity_sequence_id_idx" ON "completed_activities" ("activity_sequence_id") ',
    );
    await queryRunner.query('CREATE INDEX "activity_template_pack_id_idx" ON "activity_template" ("pack_id") ');
    await queryRunner.query('CREATE INDEX "activity_template_user_id_idx" ON "activity_template" ("user_id") ');
    await queryRunner.query('CREATE INDEX "habit_packs_user_id_idx" ON "habit_packs" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "installed_packs_activity_sequence_id_idx" ON "installed_packs" ("activity_sequence_id") ',
    );
    await queryRunner.query('CREATE INDEX "installed_packs_pack_id_idx" ON "installed_packs" ("pack_id") ');
    await queryRunner.query('CREATE INDEX "installed_packs_user_id_idx" ON "installed_packs" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "completed_activity_sequences_finish_time_idx" ON "completed_activity_sequences" ("finish_time") ',
    );
    await queryRunner.query(
      'CREATE INDEX "completed_activity_sequences_start_time_idx" ON "completed_activity_sequences" ("start_time") ',
    );
    await queryRunner.query(
      'CREATE INDEX "completed_activity_sequences_user_id_idx" ON "completed_activity_sequences" ("user_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "completed_activity_sequences_activity_sequence_id_idx" ON "completed_activity_sequences" ("activity_sequence_id") ',
    );
    await queryRunner.query('CREATE INDEX "daily_stats_user_id_idx" ON "daily_stats" ("user_id") ');
    await queryRunner.query(
      'ALTER TABLE "admin_access_requests" ADD CONSTRAINT "admin_access_requests_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "course_enrolments" ADD CONSTRAINT "course_enrolments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "course_enrolments" ADD CONSTRAINT "course_enrolments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "courses" ADD CONSTRAINT "courses_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "course_ratings" ADD CONSTRAINT "course_ratings_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "course_ratings" ADD CONSTRAINT "course_ratings_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "course_ratings" ADD CONSTRAINT "course_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_sequences" ADD CONSTRAINT "activity_sequences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_sequences" ADD CONSTRAINT "activity_sequences_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "habit_packs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "users_signed_up_via_focus_mode_fkey" FOREIGN KEY ("signed_up_via_focus_mode") REFERENCES "focus_mode_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "users_signed_up_via_habit_pack_fkey" FOREIGN KEY ("signed_up_via_habit_pack") REFERENCES "habit_packs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "users_current_completing_sequence_log_id_fkey" FOREIGN KEY ("current_completing_sequence_log_id") REFERENCES "completed_activity_sequences"("id") ON DELETE SET NULL ON UPDATE SET NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "users_last_completed_sequence_id_fkey" FOREIGN KEY ("last_completed_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "users_owner_of_team_id_fkey" FOREIGN KEY ("owner_of_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE SET NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "users_member_of_team_id_fkey" FOREIGN KEY ("member_of_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE SET NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "users_current_completing_focus_block_id_fkey" FOREIGN KEY ("current_completing_focus_block_id") REFERENCES "completed_focus_blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "users_current_activity_id_fkey" FOREIGN KEY ("current_activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "users_current_focus_mode_id_fkey" FOREIGN KEY ("current_focus_mode_id") REFERENCES "focus_modes"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "users_current_activity_sequence_id_fkey" FOREIGN KEY ("current_activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "user_consent" ADD CONSTRAINT "user_consent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "focus_modes" ADD CONSTRAINT "focus_modes_focus_mode_template_id_fkey" FOREIGN KEY ("focus_mode_template_id") REFERENCES "focus_mode_templates"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "focus_modes" ADD CONSTRAINT "focus_modes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_focus_blocks" ADD CONSTRAINT "completed_focus_blocks_focus_mode_id_fkey" FOREIGN KEY ("focus_mode_id") REFERENCES "focus_modes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_focus_blocks" ADD CONSTRAINT "completed_focus_blocks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "focus_mode_templates" ADD CONSTRAINT "FK_219ca4ea35a2fb153fefd0ce27a" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_focus_mode_templates" ADD CONSTRAINT "installed_focus_mode_templates_focus_mode_template_id_fkey" FOREIGN KEY ("focus_mode_template_id") REFERENCES "focus_mode_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_focus_mode_templates" ADD CONSTRAINT "installed_focus_mode_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ADD CONSTRAINT "activities_activity_template_id_fkey" FOREIGN KEY ("activity_template_id") REFERENCES "activity_template"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ADD CONSTRAINT "activities_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ADD CONSTRAINT "activities_activity_sequence_id_fkey" FOREIGN KEY ("activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "completed_activities_completed_sequence_id_fkey" FOREIGN KEY ("completed_sequence_id") REFERENCES "completed_activity_sequences"("id") ON DELETE SET NULL ON UPDATE SET NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "completed_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "completed_activities_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "completed_activities_activity_sequence_id_fkey" FOREIGN KEY ("activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_template" ADD CONSTRAINT "activity_template_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "activity_template"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_template" ADD CONSTRAINT "activity_template_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_template" ADD CONSTRAINT "activity_template_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "habit_packs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "habit_packs" ADD CONSTRAINT "habit_packs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_packs" ADD CONSTRAINT "installed_packs_activity_sequence_id_fkey" FOREIGN KEY ("activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_packs" ADD CONSTRAINT "installed_packs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_packs" ADD CONSTRAINT "installed_packs_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "habit_packs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" ADD CONSTRAINT "completed_activity_sequences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" ADD CONSTRAINT "completed_activity_sequences_activity_sequence_id_fkey" FOREIGN KEY ("activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ADD CONSTRAINT "daily_stats_evening_sequence_log_id_fkey" FOREIGN KEY ("evening_sequence_log_id") REFERENCES "completed_activity_sequences"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ADD CONSTRAINT "daily_stats_morning_sequence_log_id_fkey" FOREIGN KEY ("morning_sequence_log_id") REFERENCES "completed_activity_sequences"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ADD CONSTRAINT "daily_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
  }
}
