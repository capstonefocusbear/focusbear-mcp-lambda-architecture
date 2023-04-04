import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateOnDeleteAndOnUpdateActions1680168827095 implements MigrationInterface {
  name = 'updateOnDeleteAndOnUpdateActions1680168827095';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
      'ALTER TABLE "focus_mode_templates" ADD CONSTRAINT "FK_13b73a21e9033f46dd3ea796417" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
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
      'ALTER TABLE "teams" ADD CONSTRAINT "FK_03655bd3d01df69022646faffd5" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
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
      'ALTER TABLE "activity_sequences" ADD CONSTRAINT "FK_24d5a15c75ddfd0c074f7ed02a6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_sequences" ADD CONSTRAINT "FK_a77fe304c31d49306caacb16db4" FOREIGN KEY ("pack_id") REFERENCES "habit_packs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
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
    await queryRunner.query(
      'ALTER TABLE "admin_access_requests" ADD CONSTRAINT "admin_access_requests_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "course_enrolments" ADD CONSTRAINT "course_enrolments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "course_enrolments" ADD CONSTRAINT "course_enrolments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
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
      'ALTER TABLE "users" ADD CONSTRAINT "users_current_activity_id_fkey" FOREIGN KEY ("current_activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "users_current_focus_mode_id_fkey" FOREIGN KEY ("current_focus_mode_id") REFERENCES "focus_modes"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "users_signed_up_via_habit_pack_fkey" FOREIGN KEY ("signed_up_via_habit_pack") REFERENCES "habit_packs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "users_current_completing_sequence_log_id_fkey" FOREIGN KEY ("current_completing_sequence_log_id") REFERENCES "completed_activity_sequences"("id") ON DELETE SET NULL ON UPDATE SET NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "users_current_activity_sequence_id_fkey" FOREIGN KEY ("current_activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "users_last_completed_sequence_id_fkey" FOREIGN KEY ("last_completed_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "users_current_completing_focus_block_id_fkey" FOREIGN KEY ("current_completing_focus_block_id") REFERENCES "completed_focus_blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "users_member_of_team_id_fkey" FOREIGN KEY ("member_of_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE SET NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "users_owner_of_team_id_fkey" FOREIGN KEY ("owner_of_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE SET NULL',
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
      'ALTER TABLE "completed_focus_blocks" ADD CONSTRAINT "completed_focus_blocks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_focus_blocks" ADD CONSTRAINT "completed_focus_blocks_focus_mode_id_fkey" FOREIGN KEY ("focus_mode_id") REFERENCES "focus_modes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
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
      'ALTER TABLE "activities" ADD CONSTRAINT "activities_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ADD CONSTRAINT "activities_activity_template_id_fkey" FOREIGN KEY ("activity_template_id") REFERENCES "activity_template"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ADD CONSTRAINT "activities_activity_sequence_id_fkey" FOREIGN KEY ("activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_template" ADD CONSTRAINT "activity_template_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_template" ADD CONSTRAINT "activity_template_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "activity_template"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_template" ADD CONSTRAINT "activity_template_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "habit_packs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "habit_packs" ADD CONSTRAINT "habit_packs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_packs" ADD CONSTRAINT "installed_packs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_packs" ADD CONSTRAINT "installed_packs_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "habit_packs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_packs" ADD CONSTRAINT "installed_packs_activity_sequence_id_fkey" FOREIGN KEY ("activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "completed_activities_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "completed_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "completed_activities_completed_sequence_id_fkey" FOREIGN KEY ("completed_sequence_id") REFERENCES "completed_activity_sequences"("id") ON DELETE SET NULL ON UPDATE SET NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "completed_activities_activity_sequence_id_fkey" FOREIGN KEY ("activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" ADD CONSTRAINT "completed_activity_sequences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" ADD CONSTRAINT "completed_activity_sequences_activity_sequence_id_fkey" FOREIGN KEY ("activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ADD CONSTRAINT "daily_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ADD CONSTRAINT "daily_stats_morning_sequence_log_id_fkey" FOREIGN KEY ("morning_sequence_log_id") REFERENCES "completed_activity_sequences"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ADD CONSTRAINT "daily_stats_evening_sequence_log_id_fkey" FOREIGN KEY ("evening_sequence_log_id") REFERENCES "completed_activity_sequences"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
  }
}
