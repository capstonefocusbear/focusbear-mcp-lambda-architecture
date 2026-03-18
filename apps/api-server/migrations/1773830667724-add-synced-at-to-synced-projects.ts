import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSyncedAtToSyncedProjects1773830667724 implements MigrationInterface {
  name = 'AddSyncedAtToSyncedProjects1773830667724';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "tutorials" DROP CONSTRAINT "tutorials_activity_template_id_fkey"');
    await queryRunner.query('ALTER TABLE "tutorials" DROP CONSTRAINT "tutorials_activity_id_fkey"');
    await queryRunner.query('ALTER TABLE "tutorials" DROP CONSTRAINT "tutorials_user_id_fkey"');
    await queryRunner.query('ALTER TABLE "activity_template_tag" DROP CONSTRAINT "FK_n8jLUZMVEBRMUiL96TPgvk63qs5"');
    await queryRunner.query(
      'ALTER TABLE "activity_template_embedding" DROP CONSTRAINT "FK_activity_template_embedding_activity_template_id"',
    );
    await queryRunner.query('ALTER TABLE "completed_activities" DROP CONSTRAINT "FK_completed_activities_activity_id"');
    await queryRunner.query('ALTER TABLE "geofences" DROP CONSTRAINT "FK_geofences_associated_routine_id"');
    await queryRunner.query('ALTER TABLE "geofences" DROP CONSTRAINT "FK_geofences_user_id"');
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "FK_activities_geofence_id"');
    await queryRunner.query('ALTER TABLE "custom_routines" DROP CONSTRAINT "FK_oW9MddBEb0sRCA9KbuQ0upFWQ95"');
    await queryRunner.query(
      'ALTER TABLE "activity_sequences" DROP CONSTRAINT "activity_sequences_custom_routine_id_fkey"',
    );
    await queryRunner.query('ALTER TABLE "project_members" DROP CONSTRAINT "FK_project_members_user_id"');
    await queryRunner.query('ALTER TABLE "project_members" DROP CONSTRAINT "FK_project_members_project_id"');
    await queryRunner.query('ALTER TABLE "projects" DROP CONSTRAINT "FK_projects_owner_id"');
    await queryRunner.query('ALTER TABLE "to_do" DROP CONSTRAINT "FK_to_do_assignee_id"');
    await queryRunner.query('ALTER TABLE "to_do" DROP CONSTRAINT "FK_to_do_project_id"');
    await queryRunner.query('ALTER TABLE "to_do" DROP CONSTRAINT "to_do_assigned_mcp_token_id_fkey"');
    await queryRunner.query('ALTER TABLE "blocking_schedules" DROP CONSTRAINT "FK_blocking_schedules_focus_mode_id"');
    await queryRunner.query('ALTER TABLE "blocking_schedules" DROP CONSTRAINT "FK_blocking_schedules_user_id"');
    await queryRunner.query('ALTER TABLE "focus_modes" DROP CONSTRAINT "FK_9d1b45fc85df3dab66ecf525e33"');
    await queryRunner.query('ALTER TABLE "impact_events" DROP CONSTRAINT "FK_09f256fb7f9a05f0ed9927f406b"');
    await queryRunner.query(
      'ALTER TABLE "unlock_requests" DROP CONSTRAINT "FK_unlock_requests_accountability_buddy_id"',
    );
    await queryRunner.query('ALTER TABLE "unlock_requests" DROP CONSTRAINT "FK_unlock_requests_user_id"');
    await queryRunner.query(
      'ALTER TABLE "accountability_buddy" DROP CONSTRAINT "FK_accountability_buddy_buddy_user_id"',
    );
    await queryRunner.query('ALTER TABLE "accountability_buddy" DROP CONSTRAINT "FK_accountability_buddy_user_id"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_bcd06c006e1f409075f80acb73a"');
    await queryRunner.query('ALTER TABLE "external_api_tokens" DROP CONSTRAINT "FK_external_api_tokens_user"');
    await queryRunner.query('ALTER TABLE "lesson-completions" DROP CONSTRAINT "lesson-completions_course_id_fkey"');
    await queryRunner.query('ALTER TABLE "lesson-completions" DROP CONSTRAINT "lesson-completions_user_id_fkey"');
    await queryRunner.query('ALTER TABLE "lesson-completions" DROP CONSTRAINT "lesson-completions_lesson_id_fkey"');
    await queryRunner.query('ALTER TABLE "team_join_codes" DROP CONSTRAINT "FK_team_join_codes_team"');
    await queryRunner.query('ALTER TABLE "survey" DROP CONSTRAINT "FK_u6eHtuWu7rv7UX4xH0QwN6Fu3Si"');
    await queryRunner.query('ALTER TABLE "survey_answer" DROP CONSTRAINT "FK_pXZz2xypWEl7I9Gx2m23Ui5lSY"');
    await queryRunner.query('ALTER TABLE "survey_answer" DROP CONSTRAINT "FK_oQ5zABu5D2GXIcmNV19r1EGFU4"');
    await queryRunner.query('ALTER TABLE "survey_answer_metadata" DROP CONSTRAINT "FK_Stvl6MJ9MsMUpVG30FG8wp3LIz"');
    await queryRunner.query('ALTER TABLE "survey_answer_metadata" DROP CONSTRAINT "FK_ismRaV8by7hUqi8QfP2uE5GXsP"');
    await queryRunner.query('ALTER TABLE "survey_answer_metadata" DROP CONSTRAINT "FK_R3i8H70N6owNahla6NAHrBKJMP"');
    await queryRunner.query(
      'ALTER TABLE "habit_library_requests" DROP CONSTRAINT "habit_library_requests_user_id_fkey"',
    );
    await queryRunner.query('ALTER TABLE "usage_data" DROP CONSTRAINT "fk_user_id"');
    await queryRunner.query('ALTER TABLE "flanker_tests" DROP CONSTRAINT "flanker_tests_study_participant_id_fkey"');
    await queryRunner.query('ALTER TABLE "announcement_views" DROP CONSTRAINT "FK_announcement_views_announcement"');
    await queryRunner.query('ALTER TABLE "task_comment_reactions" DROP CONSTRAINT "FK_task_comment_reactions_user"');
    await queryRunner.query('ALTER TABLE "task_comment_reactions" DROP CONSTRAINT "FK_task_comment_reactions_comment"');
    await queryRunner.query('ALTER TABLE "task_reactions" DROP CONSTRAINT "FK_task_reactions_user"');
    await queryRunner.query('ALTER TABLE "task_reactions" DROP CONSTRAINT "FK_task_reactions_task"');
    await queryRunner.query('ALTER TABLE "note_tags" DROP CONSTRAINT "FK_note_tags_user"');
    await queryRunner.query('ALTER TABLE "notes" DROP CONSTRAINT "FK_notes_completed_activity"');
    await queryRunner.query('ALTER TABLE "notes" DROP CONSTRAINT "FK_notes_user"');
    await queryRunner.query('ALTER TABLE "webhook_subscriptions" DROP CONSTRAINT "FK_webhook_subscriptions_user_id"');
    await queryRunner.query('ALTER TABLE "notes_tags" DROP CONSTRAINT "FK_notes_tags_tag"');
    await queryRunner.query('ALTER TABLE "notes_tags" DROP CONSTRAINT "FK_notes_tags_note"');
    await queryRunner.query('ALTER TABLE "notes_todos" DROP CONSTRAINT "FK_notes_todos_todo"');
    await queryRunner.query('ALTER TABLE "notes_todos" DROP CONSTRAINT "FK_notes_todos_note"');
    await queryRunner.query('DROP INDEX "public"."IDX_o667gpof3w61vudhm34dhlwm8q"');
    await queryRunner.query('DROP INDEX "public"."idx_cas_user_created_at"');
    await queryRunner.query('DROP INDEX "public"."idx_cas_user_current"');
    await queryRunner.query('DROP INDEX "public"."idx_cas_user_start_time"');
    await queryRunner.query('DROP INDEX "public"."IDX_qfVpYQoSmNdSGVGRxiA9Kj4Rge"');
    await queryRunner.query('DROP INDEX "public"."IDX_hf2LeJsAdUGFZHUHerwf5xEbBt"');
    await queryRunner.query('DROP INDEX "public"."IDX_gft9h2R0KMh1Evwj6fXUumUMZo"');
    await queryRunner.query('DROP INDEX "public"."IDX_KH0jea5gZu1t5wRx7hHp0zXzoQA"');
    await queryRunner.query('DROP INDEX "public"."IDX_activity_template_embedding_activity_template_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_activity_template_embedding_vector"');
    await queryRunner.query('DROP INDEX "public"."idx_ca_seq_created"');
    await queryRunner.query('DROP INDEX "public"."idx_ca_user_start_time"');
    await queryRunner.query('DROP INDEX "public"."idx_ca_user_start_time_open"');
    await queryRunner.query('DROP INDEX "public"."IDX_geofences_user_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_activities_is_deleted"');
    await queryRunner.query('DROP INDEX "public"."IDX_activities_geofence_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_hvMmToO4T5tiNXK7QzA4BiW1Yns"');
    await queryRunner.query('DROP INDEX "public"."IDX_D5RRBIpEoX16Af70wnkTqAGgR15"');
    await queryRunner.query('DROP INDEX "public"."IDX_zabc9tUdnbxe3zlOtx4Zy23z4YP"');
    await queryRunner.query('DROP INDEX "public"."IDX_SQvsdEy02YnAsHD2X64lRzLT7Ro"');
    await queryRunner.query('DROP INDEX "public"."IDX_pzsv0ck410cxrvd2v4smbas652"');
    await queryRunner.query('DROP INDEX "public"."IDX_39wsf0gkn86nxvil06558nvgmv"');
    await queryRunner.query('DROP INDEX "public"."IDX_ro4m0f7l6atmy2wnnzt26ae192"');
    await queryRunner.query('DROP INDEX "public"."IDX_project_members_project_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_project_members_user_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_project_members_email"');
    await queryRunner.query('DROP INDEX "public"."IDX_project_members_invitation_status"');
    await queryRunner.query('DROP INDEX "public"."IDX_projects_owner_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_projects_deleted_at"');
    await queryRunner.query('DROP INDEX "public"."IDX_projects_external_project_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_to_do_assigned_mcp_token_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_to_do_assignee_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_to_do_custom_status_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_to_do_project_id"');
    await queryRunner.query('DROP INDEX "public"."idx_cfb_user_created_at"');
    await queryRunner.query('DROP INDEX "public"."IDX_completed_focus_blocks_user_finish_time"');
    await queryRunner.query('DROP INDEX "public"."IDX_blocking_schedules_user_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_blocking_schedules_focus_mode_id"');
    await queryRunner.query('DROP INDEX "public"."idx_focus_modes_user_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_zriaxz223ikus58oc0pwgli9b8"');
    await queryRunner.query('DROP INDEX "public"."IDX_4z5472st6c1jq1ix6yprjclh9w"');
    await queryRunner.query('DROP INDEX "public"."IDX_nm1q170jaau0xd24ny7eawk17w"');
    await queryRunner.query('DROP INDEX "public"."IDX_team_to_member_team_id_member_id_unique"');
    await queryRunner.query('DROP INDEX "public"."idx_team_to_admin_admin_id"');
    await queryRunner.query('DROP INDEX "public"."idx_team_to_admin_team_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_notifications_notification_type"');
    await queryRunner.query('DROP INDEX "public"."IDX_notifications_related_entity"');
    await queryRunner.query('DROP INDEX "public"."IDX_09f256fb7f9a05f0ed9927f406"');
    await queryRunner.query('DROP INDEX "public"."IDX_axkykmeh2d0708qs85r1nwih1b"');
    await queryRunner.query('DROP INDEX "public"."IDX_1jtfjwb582e5iddb0pa0c5jore"');
    await queryRunner.query('DROP INDEX "public"."IDX_9gmpnq10kzqlqi362nb93l79au"');
    await queryRunner.query('DROP INDEX "public"."calendar_excluded_keywords_user_id_idx"');
    await queryRunner.query('DROP INDEX "public"."calendars_user_id_idx"');
    await queryRunner.query('DROP INDEX "public"."IDX_unlock_requests_user_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_unlock_requests_accountability_buddy_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_unlock_requests_status"');
    await queryRunner.query('DROP INDEX "public"."IDX_accountability_buddy_user_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_accountability_buddy_buddy_user_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_accountability_buddy_invitation_status"');
    await queryRunner.query('DROP INDEX "public"."IDX_users_email_frequency"');
    await queryRunner.query('DROP INDEX "public"."IDX_5KHXo4YDbFf39Ji8vzk5h9sWSkb"');
    await queryRunner.query('DROP INDEX "public"."IDX_external_api_tokens_user_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_external_api_tokens_prefix"');
    await queryRunner.query('DROP INDEX "public"."lesson-completions_course_id_idx"');
    await queryRunner.query('DROP INDEX "public"."lesson-completions_user_id_idx"');
    await queryRunner.query('DROP INDEX "public"."lesson-completions_lesson_id_idx"');
    await queryRunner.query('DROP INDEX "public"."IDX_m6FzG2vfZZf9bQhgyJsPyzUDoQ"');
    await queryRunner.query('DROP INDEX "public"."IDX_581692VXZdgrnLxFnNrGENy37"');
    await queryRunner.query('DROP INDEX "public"."IDX_Q82YCfhFgtAVB7o36yvSQylSm"');
    await queryRunner.query('DROP INDEX "public"."IDX_team_join_codes_code"');
    await queryRunner.query('DROP INDEX "public"."IDX_team_join_codes_team_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_6ZPxFY25u1rVbx5e1P8uEbZdcZ"');
    await queryRunner.query('DROP INDEX "public"."IDX_uO0G6ewX8s1TJ0U3EZcaKEJjys"');
    await queryRunner.query('DROP INDEX "public"."IDX_O5T2rc2utJxaGiBUfGp6IQr5m5"');
    await queryRunner.query('DROP INDEX "public"."IDX_eJjqSvhNbEEG63HJyKd599K2kl"');
    await queryRunner.query('DROP INDEX "public"."IDX_VhFZW0MmN9MK0j7a46Odm34bHx"');
    await queryRunner.query('DROP INDEX "public"."IDX_lH8P0N3z82dEu7b6NNy2BkGu6I"');
    await queryRunner.query('DROP INDEX "public"."habit_library_requests_user_id_idx"');
    await queryRunner.query('DROP INDEX "public"."habit_library_requests_goal_idx"');
    await queryRunner.query('DROP INDEX "public"."idx_study_participants_user_id"');
    await queryRunner.query('DROP INDEX "public"."idx_study_participants_code"');
    await queryRunner.query('DROP INDEX "public"."idx_study_participants_email"');
    await queryRunner.query('DROP INDEX "public"."idx_study_participants_reserved_at"');
    await queryRunner.query('DROP INDEX "public"."idx_usage_data_user_id"');
    await queryRunner.query('DROP INDEX "public"."idx_usage_data_user_id_platform_day"');
    await queryRunner.query('DROP INDEX "public"."idx_usage_data_date_range"');
    await queryRunner.query('DROP INDEX "public"."idx_usage_data_composite"');
    await queryRunner.query('DROP INDEX "public"."idx_usage_data_updated_at"');
    await queryRunner.query('DROP INDEX "public"."idx_health_metrics_user_id"');
    await queryRunner.query('DROP INDEX "public"."idx_health_metrics_metric_type"');
    await queryRunner.query('DROP INDEX "public"."idx_health_metrics_day_of_tracking"');
    await queryRunner.query('DROP INDEX "public"."idx_flanker_tests_study_participant_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_async_tasks_status"');
    await queryRunner.query('DROP INDEX "public"."IDX_async_tasks_created_at"');
    await queryRunner.query('DROP INDEX "public"."IDX_async_tasks_dedup_processing_lookup"');
    await queryRunner.query('DROP INDEX "public"."IDX_async_tasks_dedup_pending_lookup"');
    await queryRunner.query('DROP INDEX "public"."IDX_app_versions_operating_system"');
    await queryRunner.query('DROP INDEX "public"."IDX_app_versions_is_supported"');
    await queryRunner.query('DROP INDEX "public"."IDX_announcements_type"');
    await queryRunner.query('DROP INDEX "public"."IDX_announcements_priority"');
    await queryRunner.query('DROP INDEX "public"."IDX_announcements_expiry_date"');
    await queryRunner.query('DROP INDEX "public"."IDX_announcements_operating_system"');
    await queryRunner.query('DROP INDEX "public"."IDX_announcement_views_user_announcement"');
    await queryRunner.query('DROP INDEX "public"."IDX_announcement_views_user_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_task_comment_reactions_comment_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_task_comment_reactions_user_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_task_comments_task_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_task_comments_user_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_task_attachments_task_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_task_attachments_user_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_comment_attachments_comment_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_comment_attachments_user_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_task_reactions_task_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_task_reactions_user_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_note_tags_user_id"');
    await queryRunner.query('DROP INDEX "public"."UQ_note_tags_user_id_text"');
    await queryRunner.query('DROP INDEX "public"."IDX_notes_user_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_notes_completed_activity_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_webhook_subscriptions_user_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_notes_tags_note_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_notes_tags_tag_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_notes_todos_note_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_notes_todos_todo_id"');
    await queryRunner.query('ALTER TABLE "project_members" DROP CONSTRAINT "UQ_project_members_project_user"');
    await queryRunner.query('ALTER TABLE "project_members" DROP CONSTRAINT "UQ_project_members_project_email"');
    await queryRunner.query(
      'ALTER TABLE "accountability_buddy" DROP CONSTRAINT "UQ_accountability_buddy_user_buddy_email"',
    );
    await queryRunner.query('ALTER TABLE "course_enrolments" DROP CONSTRAINT "UQ_course_enrolments_user_id_course_id"');
    await queryRunner.query('ALTER TABLE "usage_data" DROP CONSTRAINT "unique_usage_data"');
    await queryRunner.query('ALTER TABLE "app_versions" DROP CONSTRAINT "UQ_app_versions_os_semver"');
    await queryRunner.query(
      'ALTER TABLE "task_comment_reactions" DROP CONSTRAINT "UQ_task_comment_reactions_comment_user_emoji"',
    );
    await queryRunner.query('ALTER TABLE "projects" DROP COLUMN "external_project_metadata"');
    await queryRunner.query('ALTER TABLE "projects" DROP COLUMN "external_project_id"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "member_of_team_id"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "morning_percent_completed"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "evening_percent_completed"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "micro_percent_completed"');
    await queryRunner.query('ALTER TABLE "daily_stats" DROP CONSTRAINT "FK_7c09b7133924634d328ea96398e"');
    await queryRunner.query('ALTER TABLE "daily_stats" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "daily_stats" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "daily_stats" ALTER COLUMN "user_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "daily_stats" ALTER COLUMN "date_completed" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "daily_stats" ALTER COLUMN "focus_modes_completed" SET NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ALTER COLUMN "morning_routine_completion_percentage" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ALTER COLUMN "evening_routine_completion_percentage" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ALTER COLUMN "micro_breaks_routine_completion_percentage" SET NOT NULL',
    );
    await queryRunner.query('ALTER TABLE "daily_stats" ALTER COLUMN "should_recalculate" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "daily_stats" ALTER COLUMN "should_recalculate" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "daily_stats" DROP COLUMN "break_sequence_log_id"');
    await queryRunner.query('ALTER TABLE "daily_stats" ADD "break_sequence_log_id" uuid');
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ADD CONSTRAINT "UQ_f2fc1124527683faa88f1bde15f" UNIQUE ("break_sequence_log_id")',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" DROP CONSTRAINT "FK_0672e8970f2bdebee79f4268254"',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" DROP CONSTRAINT "FK_cb520c9fab7e274b4bd190f3016"',
    );
    await queryRunner.query('ALTER TABLE "completed_activity_sequences" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "completed_activity_sequences" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "completed_activity_sequences" ALTER COLUMN "user_id" SET NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" ALTER COLUMN "activity_sequence_id" SET NOT NULL',
    );
    await queryRunner.query('ALTER TABLE "completed_activity_sequences" ALTER COLUMN "start_time" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_activity_sequences" ALTER COLUMN "finish_time" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_activity_sequences" ALTER COLUMN "duration_minutes" SET NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" ALTER COLUMN "plan_duration_minutes" SET NOT NULL',
    );
    await queryRunner.query('ALTER TABLE "completed_activity_sequences" ALTER COLUMN "is_completed" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" ALTER COLUMN "duration_percent_deviation" SET NOT NULL',
    );
    await queryRunner.query('ALTER TABLE "installed_packs" DROP CONSTRAINT "FK_634d333e9adb5d90a96aeffdd46"');
    await queryRunner.query('ALTER TABLE "installed_packs" DROP CONSTRAINT "FK_9c3607b832d303ccf87bcb9f00b"');
    await queryRunner.query('ALTER TABLE "installed_packs" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "installed_packs" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "installed_packs" ALTER COLUMN "user_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "installed_packs" ALTER COLUMN "pack_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "installed_packs" ALTER COLUMN "installation_status" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "installed_packs" ALTER COLUMN "activity_sequence_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "habit_packs" DROP CONSTRAINT "FK_c78642e7a487983c6eef72ab977"');
    await queryRunner.query('ALTER TABLE "habit_packs" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "habit_packs" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "habit_packs" ALTER COLUMN "user_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "habit_packs" DROP COLUMN "pack_type"');
    await queryRunner.query('DROP TYPE "public"."habit_pack_types"');
    await queryRunner.query('ALTER TABLE "habit_packs" ADD "pack_type" character varying NOT NULL');
    await queryRunner.query('ALTER TABLE "habit_packs" DROP COLUMN "pack_name"');
    await queryRunner.query('ALTER TABLE "habit_packs" ADD "pack_name" character varying NOT NULL');
    await queryRunner.query('ALTER TABLE "habit_packs" DROP COLUMN "creator_name"');
    await queryRunner.query('ALTER TABLE "habit_packs" ADD "creator_name" character varying NOT NULL');
    await queryRunner.query('ALTER TABLE "habit_packs" DROP COLUMN "description"');
    await queryRunner.query('ALTER TABLE "habit_packs" ADD "description" character varying NOT NULL');
    await queryRunner.query('ALTER TABLE "habit_packs" DROP COLUMN "description_video_url"');
    await queryRunner.query('ALTER TABLE "habit_packs" ADD "description_video_url" character varying NOT NULL');
    await queryRunner.query('ALTER TABLE "habit_packs" DROP COLUMN "welcome_message"');
    await queryRunner.query('ALTER TABLE "habit_packs" ADD "welcome_message" character varying NOT NULL');
    await queryRunner.query('ALTER TABLE "habit_packs" DROP COLUMN "welcome_video_url"');
    await queryRunner.query('ALTER TABLE "habit_packs" ADD "welcome_video_url" character varying NOT NULL');
    await queryRunner.query('ALTER TABLE "habit_packs" ALTER COLUMN "marketplace_approval_status" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "habit_packs" DROP COLUMN "marketplace_request"');
    await queryRunner.query('DROP TYPE "public"."marketplace_request"');
    await queryRunner.query(
      'ALTER TABLE "habit_packs" ADD "marketplace_request" boolean NOT NULL DEFAULT \'unrequested\'',
    );
    await queryRunner.query('ALTER TABLE "habit_packs" ALTER COLUMN "is_featured" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "habit_packs" ALTER COLUMN "featured_for_onboarding" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "habit_packs" DROP COLUMN "language"');
    await queryRunner.query('ALTER TABLE "habit_packs" ADD "language" character varying NOT NULL');
    await queryRunner.query('ALTER TABLE "habit_packs" ALTER COLUMN "morning_routine_duration_seconds" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "habit_packs" ALTER COLUMN "evening_routine_duration_seconds" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "habit_packs" ALTER COLUMN "duration" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "habit_packs" ALTER COLUMN "breaks_only" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "habit_packs" DROP COLUMN "deleted_at"');
    await queryRunner.query('ALTER TABLE "habit_packs" ADD "deleted_at" TIMESTAMP');
    await queryRunner.query('ALTER TABLE "tutorials" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "tutorials" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "tutorials" ALTER COLUMN "activity_id" SET NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "tutorials" ADD CONSTRAINT "UQ_fadb0c4b276a354163f33b59d7e" UNIQUE ("activity_id")',
    );
    await queryRunner.query('ALTER TABLE "tutorials" DROP COLUMN "user_id"');
    await queryRunner.query('ALTER TABLE "tutorials" ADD "user_id" character varying NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "tutorials" ADD CONSTRAINT "UQ_9f026abf577dbec095417ceed1a" UNIQUE ("activity_template_id")',
    );
    await queryRunner.query('ALTER TABLE "activity_template_tag" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "activity_template_tag" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "activity_template_tag" ALTER COLUMN "tags" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "activity_template_embedding" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "activity_template_embedding" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "activity_template_embedding" DROP COLUMN "embedding"');
    await queryRunner.query('ALTER TABLE "activity_template_embedding" ADD "embedding" vector NOT NULL');
    await queryRunner.query('ALTER TABLE "activity_template" DROP CONSTRAINT "FK_164ed73d380a84065291f14b587"');
    await queryRunner.query('ALTER TABLE "activity_template" DROP CONSTRAINT "FK_812680d65acf98b56f5ee4d0513"');
    await queryRunner.query('ALTER TABLE "activity_template" DROP CONSTRAINT "FK_b4153d8eb28b96ba7e7456c9dec"');
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "pack_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "user_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "activity_template" DROP COLUMN "activity_type"');
    await queryRunner.query('DROP TYPE "public"."activity_types"');
    await queryRunner.query('ALTER TABLE "activity_template" ADD "activity_type" character varying NOT NULL');
    await queryRunner.query('ALTER TYPE "public"."log_summary_types" RENAME TO "log_summary_types_old"');
    await queryRunner.query('CREATE TYPE "public"."activity_template_log_summary_type_enum" AS ENUM(\'SUM\', \'AVG\')');
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "log_summary_type" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "activity_template" ALTER COLUMN "log_summary_type" TYPE "public"."activity_template_log_summary_type_enum" USING "log_summary_type"::"text"::"public"."activity_template_log_summary_type_enum"',
    );
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "log_summary_type" SET DEFAULT \'SUM\'');
    await queryRunner.query('DROP TYPE "public"."log_summary_types_old"');
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "log_summary_type" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "log_quantity" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "activity_data" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "has_choices" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "has_choices" SET DEFAULT false');
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "duration_seconds" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "parent_id" SET NOT NULL');
    await queryRunner.query('ALTER TYPE "public"."impact_category_enum" RENAME TO "impact_category_enum_old"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"activity_template_impact_category_enum\" AS ENUM('hours_of_sleep', 'energy_level_upon_awakening', 'mood', 'perception_of_productivity', 'minutes_spent_on_distracting_websites', 'minutes_spent_postponing_app_blocks', 'minutes_spent_postponing_habits')",
    );
    await queryRunner.query(
      'ALTER TABLE "activity_template" ALTER COLUMN "impact_category" TYPE "public"."activity_template_impact_category_enum" USING "impact_category"::"text"::"public"."activity_template_impact_category_enum"',
    );
    await queryRunner.query('DROP TYPE "public"."impact_category_enum_old"');
    await queryRunner.query('ALTER TABLE "activity_template" DROP COLUMN "deleted_at"');
    await queryRunner.query('ALTER TABLE "activity_template" ADD "deleted_at" TIMESTAMP');
    await queryRunner.query('ALTER TABLE "log_quantity_questions" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "log_quantity_questions" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "log_quantity_answers" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "log_quantity_answers" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "log_quantity_answers" ALTER COLUMN "date_logged" SET DEFAULT \'"2026-03-18T10:44:31.224Z"\'',
    );
    await queryRunner.query('ALTER TABLE "completed_activities" DROP CONSTRAINT "FK_8e655b7aaf5014e0cd9d7bc472c"');
    await queryRunner.query('ALTER TABLE "completed_activities" DROP CONSTRAINT "FK_912820036acd64c083c3f7671b5"');
    await queryRunner.query('ALTER TABLE "completed_activities" DROP CONSTRAINT "FK_275037203433cfef2b5c1e62bd2"');
    await queryRunner.query(
      'ALTER TABLE "completed_activities" DROP CONSTRAINT "unique_index_activity_id_completed_sequence_id"',
    );
    await queryRunner.query('ALTER TABLE "completed_activities" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "completed_activities" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "completed_activities" ALTER COLUMN "user_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_activities" ALTER COLUMN "activity_sequence_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_activities" ALTER COLUMN "start_time" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_activities" ALTER COLUMN "finish_time" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_activities" ALTER COLUMN "quantity_logged" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_activities" ALTER COLUMN "duration_logged" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_activities" ALTER COLUMN "completed_sequence_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_activities" ALTER COLUMN "activity_note" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "geofences" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "geofences" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "FK_b82f1d8368dd5305ae7e7e664c2"');
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "FK_797b2408833193b3a5fd0216f42"');
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "FK_62b1bed769a3fa8d7f2bacf948c"');
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "FK_55fe1e1514a9f21cf7e5b46d8b0"');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "user_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "parent_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "activity_template_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "has_choices" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "activity_sequence_id" SET NOT NULL');
    await queryRunner.query('ALTER TYPE "public"."activity_types" RENAME TO "activity_types_old"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"activities_activity_type_enum\" AS ENUM('breaking', 'morning', 'evening', 'standalone', 'library')",
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ALTER COLUMN "activity_type" TYPE "public"."activities_activity_type_enum" USING "activity_type"::"text"::"public"."activities_activity_type_enum"',
    );
    await queryRunner.query('DROP TYPE "public"."activity_types_old"');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "activity_type" SET NOT NULL');
    await queryRunner.query('ALTER TYPE "public"."log_summary_types" RENAME TO "log_summary_types_old"');
    await queryRunner.query('CREATE TYPE "public"."activities_log_summary_type_enum" AS ENUM(\'SUM\', \'AVG\')');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "log_summary_type" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "activities" ALTER COLUMN "log_summary_type" TYPE "public"."activities_log_summary_type_enum" USING "log_summary_type"::"text"::"public"."activities_log_summary_type_enum"',
    );
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "log_summary_type" SET DEFAULT \'SUM\'');
    await queryRunner.query('DROP TYPE "public"."log_summary_types_old"');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "log_summary_type" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "log_quantity" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "duration_seconds" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "activity_data" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "is_default" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "run_micro_breaks" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "days_of_week" DROP DEFAULT');
    await queryRunner.query('ALTER TYPE "public"."impact_category_enum" RENAME TO "impact_category_enum_old"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"activities_impact_category_enum\" AS ENUM('hours_of_sleep', 'energy_level_upon_awakening', 'mood', 'perception_of_productivity', 'minutes_spent_on_distracting_websites', 'minutes_spent_postponing_app_blocks', 'minutes_spent_postponing_habits')",
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ALTER COLUMN "impact_category" TYPE "public"."activities_impact_category_enum" USING "impact_category"::"text"::"public"."activities_impact_category_enum"',
    );
    await queryRunner.query('DROP TYPE "public"."impact_category_enum_old"');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "cutoff_time_for_doing_activity" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "custom_routines" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "custom_routines" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TYPE "public"."custom_routine_trigger_enum" RENAME TO "custom_routine_trigger_enum_old"',
    );
    await queryRunner.query(
      'CREATE TYPE "public"."custom_routines_trigger_enum" AS ENUM(\'ON_DEMAND\', \'ON_SCHEDULE\')',
    );
    await queryRunner.query('ALTER TABLE "custom_routines" ALTER COLUMN "trigger" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "custom_routines" ALTER COLUMN "trigger" TYPE "public"."custom_routines_trigger_enum" USING "trigger"::"text"::"public"."custom_routines_trigger_enum"',
    );
    await queryRunner.query('ALTER TABLE "custom_routines" ALTER COLUMN "trigger" SET DEFAULT \'ON_DEMAND\'');
    await queryRunner.query('DROP TYPE "public"."custom_routine_trigger_enum_old"');
    await queryRunner.query('ALTER TABLE "custom_routines" ALTER COLUMN "start_time" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "custom_routines" ALTER COLUMN "end_time" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "activity_sequences" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "activity_sequences" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TYPE "public"."activity_types" RENAME TO "activity_types_old"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"activity_sequences_type_enum\" AS ENUM('breaking', 'morning', 'evening', 'standalone', 'library')",
    );
    await queryRunner.query(
      'ALTER TABLE "activity_sequences" ALTER COLUMN "type" TYPE "public"."activity_sequences_type_enum" USING "type"::"text"::"public"."activity_sequences_type_enum"',
    );
    await queryRunner.query('DROP TYPE "public"."activity_types_old"');
    await queryRunner.query('ALTER TABLE "activity_sequences" ALTER COLUMN "activity_ids" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "activity_sequences" ALTER COLUMN "total_duration_seconds" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "activity_sequences" ALTER COLUMN "custom_routine_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "devices" DROP CONSTRAINT "FK_5e9bee993b4ce35c3606cda194c"');
    await queryRunner.query('ALTER TABLE "devices" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "devices" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "devices" ALTER COLUMN "user_id" SET NOT NULL');
    await queryRunner.query('ALTER TYPE "public"."operating_systems" RENAME TO "operating_systems_old"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"devices_operating_system_enum\" AS ENUM('MacOS', 'Windows', 'Android', 'iOS', 'Web', 'Unknown')",
    );
    await queryRunner.query(
      'ALTER TABLE "devices" ALTER COLUMN "operating_system" TYPE "public"."devices_operating_system_enum" USING "operating_system"::"text"::"public"."devices_operating_system_enum"',
    );
    await queryRunner.query('DROP TYPE "public"."operating_systems_old"');
    await queryRunner.query('ALTER TABLE "devices" ALTER COLUMN "operating_system" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "devices" ALTER COLUMN "is_leader" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "devices" ALTER COLUMN "is_leader" SET DEFAULT false');
    await queryRunner.query('ALTER TABLE "devices" ALTER COLUMN "metadata" SET NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "installed_focus_mode_templates" DROP CONSTRAINT "FK_9794613b59be7595599b692c48e"',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_focus_mode_templates" DROP CONSTRAINT "FK_811874df684c60b8720047d86fb"',
    );
    await queryRunner.query('ALTER TABLE "installed_focus_mode_templates" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "installed_focus_mode_templates" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "installed_focus_mode_templates" ALTER COLUMN "user_id" SET NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "installed_focus_mode_templates" ALTER COLUMN "focus_mode_template_id" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_focus_mode_templates" ALTER COLUMN "installation_status" SET NOT NULL',
    );
    await queryRunner.query('ALTER TABLE "tasks_time_logs" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "tasks_time_logs" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "synced_projects" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "synced_projects" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "project_members" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "project_members" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TYPE "public"."project_member_role_enum" RENAME TO "project_member_role_enum_old"');
    await queryRunner.query("CREATE TYPE \"public\".\"project_members_role_enum\" AS ENUM('owner', 'admin', 'member')");
    await queryRunner.query('ALTER TABLE "project_members" ALTER COLUMN "role" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "project_members" ALTER COLUMN "role" TYPE "public"."project_members_role_enum" USING "role"::"text"::"public"."project_members_role_enum"',
    );
    await queryRunner.query('ALTER TABLE "project_members" ALTER COLUMN "role" SET DEFAULT \'member\'');
    await queryRunner.query('DROP TYPE "public"."project_member_role_enum_old"');
    await queryRunner.query(
      'ALTER TYPE "public"."project_member_invitation_status_enum" RENAME TO "project_member_invitation_status_enum_old"',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"project_members_invitation_status_enum\" AS ENUM('pending', 'accepted', 'declined', 'failed')",
    );
    await queryRunner.query('ALTER TABLE "project_members" ALTER COLUMN "invitation_status" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "project_members" ALTER COLUMN "invitation_status" TYPE "public"."project_members_invitation_status_enum" USING "invitation_status"::"text"::"public"."project_members_invitation_status_enum"',
    );
    await queryRunner.query('ALTER TABLE "project_members" ALTER COLUMN "invitation_status" SET DEFAULT \'pending\'');
    await queryRunner.query('DROP TYPE "public"."project_member_invitation_status_enum_old"');
    await queryRunner.query('ALTER TABLE "project_members" ALTER COLUMN "invitation_sent_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "projects" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "projects" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "projects" ALTER COLUMN "custom_statuses" SET NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "projects" ALTER COLUMN "custom_statuses" SET DEFAULT \'[{"id":"default-todo","label":"To Do","color":"#6B7280","order":0,"should_complete_task":false},{"id":"default-in-progress","label":"In Progress","color":"#3B82F6","order":1,"should_complete_task":false},{"id":"default-done","label":"Done","color":"#10B981","order":2,"should_complete_task":true}]\'',
    );
    await queryRunner.query('ALTER TABLE "to_do" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "to_do" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "to_do" DROP COLUMN "status"');
    await queryRunner.query('ALTER TABLE "to_do" ADD "status" character varying NOT NULL DEFAULT \'NOT_STARTED\'');
    await queryRunner.query('ALTER TABLE "to_do" DROP COLUMN "duration"');
    await queryRunner.query('ALTER TABLE "to_do" ADD "duration" integer NOT NULL DEFAULT \'0\'');
    await queryRunner.query('ALTER TABLE "to_do" DROP COLUMN "icon"');
    await queryRunner.query('ALTER TABLE "to_do" ADD "icon" character varying');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" DROP CONSTRAINT "FK_e07f494fb6be4bd758fd6bcb8d6"');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" DROP CONSTRAINT "FK_1b5cd35b5bdda454fd7ae27b2a9"');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" ALTER COLUMN "user_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" ALTER COLUMN "focus_mode_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" ALTER COLUMN "start_time" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" ALTER COLUMN "finish_time" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" ALTER COLUMN "intention" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" ALTER COLUMN "achievements" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" ALTER COLUMN "distractions" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" ALTER COLUMN "metadata" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_mode_tags" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "focus_mode_tags" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "author_name" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "name" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "allowed_apps" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "allowed_urls" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "description" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "description_video_url" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "welcome_message" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "welcome_video_url" SET NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "focus_mode_templates" ALTER COLUMN "marketplace_approval_status" SET NOT NULL',
    );
    await queryRunner.query('ALTER TABLE "focus_mode_templates" DROP COLUMN "marketplace_request"');
    await queryRunner.query('DROP TYPE "public"."marketplace_request"');
    await queryRunner.query(
      'ALTER TABLE "focus_mode_templates" ADD "marketplace_request" boolean NOT NULL DEFAULT \'unrequested\'',
    );
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "is_featured" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "featured_for_onboarding" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "language" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" DROP COLUMN "deleted_at"');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ADD "deleted_at" TIMESTAMP');
    await queryRunner.query('ALTER TABLE "blocking_schedules" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "blocking_schedules" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TYPE "public"."pause_friction_enum" RENAME TO "pause_friction_enum_old"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"blocking_schedules_pause_friction_enum\" AS ENUM('none', 'timer', '100_random_chars', 'password')",
    );
    await queryRunner.query('ALTER TABLE "blocking_schedules" ALTER COLUMN "pause_friction" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "blocking_schedules" ALTER COLUMN "pause_friction" TYPE "public"."blocking_schedules_pause_friction_enum" USING "pause_friction"::"text"::"public"."blocking_schedules_pause_friction_enum"',
    );
    await queryRunner.query('ALTER TABLE "blocking_schedules" ALTER COLUMN "pause_friction" SET DEFAULT \'none\'');
    await queryRunner.query('DROP TYPE "public"."pause_friction_enum_old"');
    await queryRunner.query('ALTER TYPE "public"."block_level_enum" RENAME TO "block_level_enum_old"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"blocking_schedules_block_level_enum\" AS ENUM('gentle', 'strict', 'super-strict')",
    );
    await queryRunner.query('ALTER TABLE "blocking_schedules" ALTER COLUMN "block_level" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "blocking_schedules" ALTER COLUMN "block_level" TYPE "public"."blocking_schedules_block_level_enum" USING "block_level"::"text"::"public"."blocking_schedules_block_level_enum"',
    );
    await queryRunner.query('ALTER TABLE "blocking_schedules" ALTER COLUMN "block_level" SET DEFAULT \'strict\'');
    await queryRunner.query('DROP TYPE "public"."block_level_enum_old"');
    await queryRunner.query('ALTER TABLE "focus_modes" DROP CONSTRAINT "FK_8c944861e1793cb9a4da0fb04c8"');
    await queryRunner.query('ALTER TABLE "focus_modes" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "focus_modes" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "focus_modes" ALTER COLUMN "user_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_modes" ALTER COLUMN "name" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_modes" ALTER COLUMN "allowed_apps" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_modes" ALTER COLUMN "allowed_urls" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_modes" ALTER COLUMN "metadata" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_modes" ALTER COLUMN "focus_mode_template_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_modes" DROP COLUMN "deleted_at"');
    await queryRunner.query('ALTER TABLE "focus_modes" ADD "deleted_at" TIMESTAMP');
    await queryRunner.query('ALTER TABLE "team_to_member" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "team_to_member" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "team_to_member" ALTER COLUMN "invitation_sent_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "team_to_admin" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "team_to_admin" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "user_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "platform" SET NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "notifications" ADD CONSTRAINT "UQ_65bd4afcb9043001c3f90facd78" UNIQUE ("platform")',
    );
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "platform_account" SET NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "notifications" ADD CONSTRAINT "UQ_cd4e54cfac92fec7384fc955179" UNIQUE ("platform_account")',
    );
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "calendar_id" SET NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "notifications" ADD CONSTRAINT "UQ_82e9861292085ee6d57ba5ecd83" UNIQUE ("calendar_id")',
    );
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "external_id" SET NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "notifications" ADD CONSTRAINT "UQ_def4fd3a4bd79c4331c2b84a2e1" UNIQUE ("external_id")',
    );
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "summary" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "description" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "event_begins" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "event_ends" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "is_dismissed" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "dismiss_reason" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "received" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" DROP COLUMN "notification_type"');
    await queryRunner.query('DROP TYPE "public"."notification_type_enum"');
    await queryRunner.query(
      'ALTER TABLE "notifications" ADD "notification_type" character varying(100) DEFAULT \'calendar_event\'',
    );
    await queryRunner.query('ALTER TABLE "user_consent" DROP CONSTRAINT "FK_4174e45dd98eb587c2348b8ca1d"');
    await queryRunner.query('ALTER TABLE "user_consent" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "user_consent" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "user_consent" ALTER COLUMN "user_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "user_consent" DROP COLUMN "consent_type"');
    await queryRunner.query('DROP TYPE "public"."consent_types"');
    await queryRunner.query('ALTER TABLE "user_consent" ADD "consent_type" character varying NOT NULL');
    await queryRunner.query('ALTER TABLE "user_consent" ALTER COLUMN "consent_status" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "user_consent" ALTER COLUMN "consent_status" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "user_consent" ALTER COLUMN "withdrawal_date" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "saved_websites_for_relax_block" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "saved_websites_for_relax_block" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "saved_websites_for_relax_block" DROP COLUMN "note"');
    await queryRunner.query('ALTER TABLE "saved_websites_for_relax_block" ADD "note" character varying');
    await queryRunner.query('ALTER TABLE "impact_events" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "impact_events" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TYPE "public"."impact_category_enum" RENAME TO "impact_category_enum_old"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"impact_events_impact_category_enum\" AS ENUM('hours_of_sleep', 'energy_level_upon_awakening', 'mood', 'perception_of_productivity', 'minutes_spent_on_distracting_websites', 'minutes_spent_postponing_app_blocks', 'minutes_spent_postponing_habits')",
    );
    await queryRunner.query(
      'ALTER TABLE "impact_events" ALTER COLUMN "impact_category" TYPE "public"."impact_events_impact_category_enum" USING "impact_category"::"text"::"public"."impact_events_impact_category_enum"',
    );
    await queryRunner.query('DROP TYPE "public"."impact_category_enum_old"');
    await queryRunner.query('ALTER TABLE "user_feedback" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "user_feedback" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "platform_integrations" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "platform_integrations" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "platform_integrations" ALTER COLUMN "only_assigned" SET DEFAULT false');
    await queryRunner.query('ALTER TABLE "calendar_excluded_keywords" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "calendar_excluded_keywords" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "calendars" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "calendars" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "calendars" ALTER COLUMN "summary" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "unlock_requests" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "unlock_requests" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "unlock_requests" DROP COLUMN "status"');
    await queryRunner.query('DROP TYPE "public"."unlock_request_status_enum"');
    await queryRunner.query(
      'ALTER TABLE "unlock_requests" ADD "status" character varying(20) NOT NULL DEFAULT \'pending\'',
    );
    await queryRunner.query('ALTER TABLE "accountability_buddy" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "accountability_buddy" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "accountability_buddy" ALTER COLUMN "buddy_email" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "accountability_buddy" DROP COLUMN "invitation_status"');
    await queryRunner.query('DROP TYPE "public"."invitation_status_enum"');
    await queryRunner.query(
      'ALTER TABLE "accountability_buddy" ADD "invitation_status" character varying(20) NOT NULL DEFAULT \'pending\'',
    );
    await queryRunner.query('ALTER TABLE "accountability_buddy" ALTER COLUMN "invitation_sent_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_975fdeac7998e0b535c84097a65"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_571efd35d4486a3d8d876bd9f78"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_24f35ae7290dee881590641795d"');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "startup_time" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "shutdown_time" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "break_after_minutes"');
    await queryRunner.query('ALTER TABLE "users" ADD "break_after_minutes" character varying(255) NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "current_focus_mode_finish_time" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "password_for_settings" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "is_office_mode_activated" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "current_focus_mode_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "current_completing_focus_block_id" SET NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "UQ_16bcf73d1900d2a3061edbeef55" UNIQUE ("current_completing_focus_block_id")',
    );
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "current_activity_assigned_at" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "current_completing_sequence_log_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "last_completed_sequence_at" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "last_completed_sequence_started_at" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "current_sequence_started_at" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "local_device_settings" SET NOT NULL');
    await queryRunner.query('ALTER TYPE "public"."user_types" RENAME TO "user_types_old"');
    await queryRunner.query('CREATE TYPE "public"."users_user_type_enum" AS ENUM(\'STANDARD\', \'ADMIN\')');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "user_type" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "user_type" TYPE "public"."users_user_type_enum" USING "user_type"::"text"::"public"."users_user_type_enum"',
    );
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "user_type" SET DEFAULT \'STANDARD\'');
    await queryRunner.query('DROP TYPE "public"."user_types_old"');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "user_type" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "signed_up_via_habit_pack" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "signed_up_via_focus_mode" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "current_sequence_skipped_activities" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "timezone"');
    await queryRunner.query('ALTER TABLE "users" ADD "timezone" character varying NOT NULL DEFAULT \'UTC\'');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "has_edited_settings" SET NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "cutoff_time_for_non_high_priority_activities" SET NOT NULL',
    );
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "metadata" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "onboarding_progress" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "last_time_stats_updated" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "last_time_stats_updated" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "last_completed_focus_mode_at" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "morning_routines_streak" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "evening_routines_streak" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "focus_modes_streak" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "micro_breaks_streak" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "num_days_of_stats"');
    await queryRunner.query('ALTER TABLE "users" ADD "num_days_of_stats" numeric NOT NULL DEFAULT \'0\'');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "number_days_completed"');
    await queryRunner.query('ALTER TABLE "users" ADD "number_days_completed" numeric NOT NULL DEFAULT \'0\'');
    await queryRunner.query('ALTER TABLE "users" ADD CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username")');
    await queryRunner.query('ALTER TYPE "public"."email_frequency_enum" RENAME TO "email_frequency_enum_old"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"users_email_frequency_enum\" AS ENUM('daily', 'weekly', 'monthly', 'unsubscribed')",
    );
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "email_frequency" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "email_frequency" TYPE "public"."users_email_frequency_enum" USING "email_frequency"::"text"::"public"."users_email_frequency_enum"',
    );
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "email_frequency" SET DEFAULT \'weekly\'');
    await queryRunner.query('DROP TYPE "public"."email_frequency_enum_old"');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "email_frequency" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "feature_flags" SET DEFAULT \'[]\'::jsonb');
    await queryRunner.query('ALTER TABLE "feedbacks" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "feedbacks" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "feedbacks" ALTER COLUMN "cancel_subscription_reason" SET NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "feedbacks" ADD CONSTRAINT "UQ_4334f6be2d7d841a9d5205a100e" UNIQUE ("user_id")',
    );
    await queryRunner.query('ALTER TABLE "video_metadata" DROP CONSTRAINT "video_metadata_pkey"');
    await queryRunner.query('ALTER TABLE "video_metadata" DROP CONSTRAINT "UQ_601cdb0e334e8838bfc0c59ca22"');
    await queryRunner.query('ALTER TABLE "video_metadata" DROP COLUMN "id"');
    await queryRunner.query('ALTER TABLE "video_metadata" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()');
    await queryRunner.query(
      'ALTER TABLE "video_metadata" ADD CONSTRAINT "PK_601cdb0e334e8838bfc0c59ca22" PRIMARY KEY ("id")',
    );
    await queryRunner.query(
      'ALTER TABLE "video_metadata" ADD CONSTRAINT "UQ_601cdb0e334e8838bfc0c59ca22" UNIQUE ("id")',
    );
    await queryRunner.query('ALTER TABLE "video_metadata" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "video_metadata" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "video_metadata" DROP COLUMN "video_url"');
    await queryRunner.query('ALTER TABLE "video_metadata" ADD "video_url" character varying NOT NULL');
    await queryRunner.query('ALTER TABLE "video_metadata" DROP COLUMN "title"');
    await queryRunner.query('ALTER TABLE "video_metadata" ADD "title" character varying NOT NULL');
    await queryRunner.query('ALTER TABLE "video_metadata" DROP COLUMN "duration"');
    await queryRunner.query('ALTER TABLE "video_metadata" ADD "duration" character varying NOT NULL');
    await queryRunner.query('ALTER TABLE "video_metadata" DROP COLUMN "thumbnail_url"');
    await queryRunner.query('ALTER TABLE "video_metadata" ADD "thumbnail_url" character varying');
    await queryRunner.query('ALTER TABLE "external_api_tokens" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "external_api_tokens" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "tracks" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "tracks" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "tracks" ALTER COLUMN "name" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "tracks" ALTER COLUMN "artist" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "tracks" ALTER COLUMN "description" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "tracks" ALTER COLUMN "file_name" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "tracks" ALTER COLUMN "duration" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "tracks" ALTER COLUMN "thumbnail_file_name" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "lessons" DROP CONSTRAINT "FK_3c4e299cf8ed04093935e2e22fe"');
    await queryRunner.query('ALTER TABLE "lessons" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "lessons" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "lessons" ALTER COLUMN "course_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "lessons" ALTER COLUMN "title" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "lessons" ALTER COLUMN "content" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "lessons" DROP COLUMN "url"');
    await queryRunner.query('ALTER TABLE "lessons" ADD "url" text NOT NULL');
    await queryRunner.query('ALTER TABLE "course_ratings" DROP CONSTRAINT "FK_01519cb0eb5e5a294938c012ef1"');
    await queryRunner.query('ALTER TABLE "course_ratings" DROP CONSTRAINT "FK_32b68ae69d8fb9200a854d6b331"');
    await queryRunner.query('ALTER TABLE "course_ratings" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "course_ratings" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "course_ratings" ALTER COLUMN "user_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "course_ratings" ALTER COLUMN "course_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "course_ratings" ALTER COLUMN "rating" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "course_ratings" ALTER COLUMN "review" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "lesson-completions" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "lesson-completions" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "lesson-completions" DROP COLUMN "status"');
    await queryRunner.query(
      'CREATE TYPE "public"."lesson-completions_status_enum" AS ENUM(\'SELF_TAUGHT\', \'TUTORIAL\')',
    );
    await queryRunner.query(
      'ALTER TABLE "lesson-completions" ADD "status" "public"."lesson-completions_status_enum" NOT NULL DEFAULT \'TUTORIAL\'',
    );
    await queryRunner.query('ALTER TABLE "lesson-completions" ALTER COLUMN "lesson_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "lesson-completions" ALTER COLUMN "course_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "lesson-completions" ALTER COLUMN "user_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "course_enrolments" DROP CONSTRAINT "FK_ce42bd84fedc0c4024ef19954b3"');
    await queryRunner.query('ALTER TABLE "course_enrolments" DROP CONSTRAINT "FK_96e267f170e2d4ff4eb70b88101"');
    await queryRunner.query('ALTER TABLE "course_enrolments" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "course_enrolments" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "course_enrolments" ALTER COLUMN "finished" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "course_enrolments" ALTER COLUMN "user_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "course_enrolments" ALTER COLUMN "course_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "courses" DROP CONSTRAINT "FK_cce7a734fa75f9f3051c50d3283"');
    await queryRunner.query('ALTER TABLE "courses" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "courses" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "courses" ALTER COLUMN "author_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "courses" ALTER COLUMN "name" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "courses" ALTER COLUMN "description" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "courses" ALTER COLUMN "is_hidden" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "courses" ALTER COLUMN "deleted" SET NOT NULL');
    await queryRunner.query('ALTER TYPE "public"."course_platforms" RENAME TO "course_platforms_old"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"courses_platform_enum\" AS ENUM('web', 'mac', 'win', 'ios', 'android')",
    );
    await queryRunner.query(
      'ALTER TABLE "courses" ALTER COLUMN "platform" TYPE "public"."courses_platform_enum" USING "platform"::"text"::"public"."courses_platform_enum"',
    );
    await queryRunner.query('ALTER TABLE "courses" ALTER COLUMN "platform" SET DEFAULT \'web\'');
    await queryRunner.query('DROP TYPE "public"."course_platforms_old"');
    await queryRunner.query('ALTER TABLE "courses" ALTER COLUMN "platform" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "courses" ALTER COLUMN "platform" SET DEFAULT \'web\'');
    await queryRunner.query('ALTER TABLE "admin_access_requests" DROP CONSTRAINT "FK_7e4952c93107f80cbfb967c9f30"');
    await queryRunner.query('ALTER TABLE "admin_access_requests" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "admin_access_requests" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "admin_access_requests" ALTER COLUMN "admin_user_id" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "team_join_codes" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "team_join_codes" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "track_event" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "track_event" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "survey" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "survey" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "survey" ALTER COLUMN "choices" SET NOT NULL');
    await queryRunner.query('ALTER TYPE "public"."answer_types" RENAME TO "answer_types_old"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"survey_answer_type_enum\" AS ENUM('CHOICES_NUMBER', 'CHOICES_BOOLEAN', 'TEXT', 'TEXT_AND_RATING')",
    );
    await queryRunner.query(
      'ALTER TABLE "survey" ALTER COLUMN "answer_type" TYPE "public"."survey_answer_type_enum" USING "answer_type"::"text"::"public"."survey_answer_type_enum"',
    );
    await queryRunner.query('DROP TYPE "public"."answer_types_old"');
    await queryRunner.query('ALTER TABLE "survey_answer" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "survey_answer" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "survey_answer" ALTER COLUMN "completed" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "survey_answer_metadata" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "survey_answer_metadata" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "survey_answer_metadata" ADD CONSTRAINT "UQ_2d8e6f21eebd0596b371cc93e0e" UNIQUE ("survey_id")',
    );
    await queryRunner.query(
      'ALTER TABLE "survey_answer_metadata" ADD CONSTRAINT "UQ_c463d824b378cd9e6bc04d07ae1" UNIQUE ("survey_answer_id")',
    );
    await queryRunner.query('ALTER TABLE "habit_library_requests" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "habit_library_requests" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "study_participants" ALTER COLUMN "created_at" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "study_participants" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "study_participants" ALTER COLUMN "updated_at" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "study_participants" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "study_participants" DROP CONSTRAINT "study_participants_participant_code_key"',
    );
    await queryRunner.query('ALTER TABLE "study_participants" DROP COLUMN "participant_code"');
    await queryRunner.query('ALTER TABLE "study_participants" ADD "participant_code" character varying NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "study_participants" ADD CONSTRAINT "UQ_8d8a7c0a64fd564bc5b66d677a9" UNIQUE ("participant_code")',
    );
    await queryRunner.query('ALTER TABLE "study_participants" DROP CONSTRAINT "study_participants_email_key"');
    await queryRunner.query('ALTER TABLE "study_participants" DROP COLUMN "email"');
    await queryRunner.query('ALTER TABLE "study_participants" ADD "email" character varying NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "study_participants" ADD CONSTRAINT "UQ_917c3db377acba3243fa1265dbf" UNIQUE ("email")',
    );
    await queryRunner.query('ALTER TABLE "study_participants" DROP COLUMN "name"');
    await queryRunner.query('ALTER TABLE "study_participants" ADD "name" character varying NOT NULL');
    await queryRunner.query('ALTER TABLE "study_participants" DROP COLUMN "user_id"');
    await queryRunner.query('ALTER TABLE "study_participants" ADD "user_id" character varying');
    await queryRunner.query('ALTER TABLE "study_participants" DROP COLUMN "assigned_group"');
    await queryRunner.query('ALTER TABLE "study_participants" ADD "assigned_group" character varying');
    await queryRunner.query(
      'ALTER TYPE "public"."app_activation_status_enum" RENAME TO "app_activation_status_enum_old"',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"study_participants_app_activation_status_enum\" AS ENUM('data_collection_mode', 'all_interventions_active', 'end_of_study')",
    );
    await queryRunner.query('ALTER TABLE "study_participants" ALTER COLUMN "app_activation_status" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "study_participants" ALTER COLUMN "app_activation_status" TYPE "public"."study_participants_app_activation_status_enum" USING "app_activation_status"::"text"::"public"."study_participants_app_activation_status_enum"',
    );
    await queryRunner.query(
      'ALTER TABLE "study_participants" ALTER COLUMN "app_activation_status" SET DEFAULT \'data_collection_mode\'',
    );
    await queryRunner.query('DROP TYPE "public"."app_activation_status_enum_old"');
    await queryRunner.query('ALTER TABLE "usage_data" DROP COLUMN "user_id"');
    await queryRunner.query('ALTER TABLE "usage_data" ADD "user_id" character varying NOT NULL');
    await queryRunner.query('ALTER TABLE "usage_data" DROP COLUMN "source_name"');
    await queryRunner.query('ALTER TABLE "usage_data" ADD "source_name" character varying NOT NULL');
    await queryRunner.query('ALTER TYPE "public"."usage_type_enum" RENAME TO "usage_type_enum_old"');
    await queryRunner.query('CREATE TYPE "public"."usage_data_usage_type_enum" AS ENUM(\'app\', \'website\')');
    await queryRunner.query(
      'ALTER TABLE "usage_data" ALTER COLUMN "usage_type" TYPE "public"."usage_data_usage_type_enum" USING "usage_type"::"text"::"public"."usage_data_usage_type_enum"',
    );
    await queryRunner.query('DROP TYPE "public"."usage_type_enum_old"');
    await queryRunner.query('ALTER TABLE "usage_data" DROP COLUMN "usage_category"');
    await queryRunner.query('ALTER TABLE "usage_data" ADD "usage_category" character varying NOT NULL');
    await queryRunner.query('ALTER TABLE "usage_data" DROP COLUMN "platform"');
    await queryRunner.query('ALTER TABLE "usage_data" ADD "platform" character varying NOT NULL');
    await queryRunner.query('ALTER TABLE "usage_data" DROP COLUMN "device_id"');
    await queryRunner.query('ALTER TABLE "usage_data" ADD "device_id" character varying NOT NULL');
    await queryRunner.query('ALTER TABLE "usage_data" DROP COLUMN "created_at"');
    await queryRunner.query('ALTER TABLE "usage_data" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()');
    await queryRunner.query('ALTER TABLE "usage_data" DROP COLUMN "updated_at"');
    await queryRunner.query('ALTER TABLE "usage_data" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()');
    await queryRunner.query('ALTER TABLE "health_metrics" DROP COLUMN "user_id"');
    await queryRunner.query('ALTER TABLE "health_metrics" ADD "user_id" character varying NOT NULL');
    await queryRunner.query('ALTER TYPE "public"."metric_type_enum" RENAME TO "metric_type_enum_old"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"health_metrics_metric_type_enum\" AS ENUM('hours_of_sleep', 'minutes_of_movement', 'number_of_steps_moved')",
    );
    await queryRunner.query(
      'ALTER TABLE "health_metrics" ALTER COLUMN "metric_type" TYPE "public"."health_metrics_metric_type_enum" USING "metric_type"::"text"::"public"."health_metrics_metric_type_enum"',
    );
    await queryRunner.query('DROP TYPE "public"."metric_type_enum_old"');
    await queryRunner.query('ALTER TABLE "health_metrics" DROP COLUMN "metric_value"');
    await queryRunner.query('ALTER TABLE "health_metrics" ADD "metric_value" double precision NOT NULL');
    await queryRunner.query('ALTER TABLE "health_metrics" DROP COLUMN "created_at"');
    await queryRunner.query('ALTER TABLE "health_metrics" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()');
    await queryRunner.query('ALTER TABLE "health_metrics" DROP COLUMN "updated_at"');
    await queryRunner.query('ALTER TABLE "health_metrics" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()');
    await queryRunner.query('ALTER TABLE "flanker_tests" DROP COLUMN "created_at"');
    await queryRunner.query('ALTER TABLE "flanker_tests" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()');
    await queryRunner.query('ALTER TABLE "flanker_tests" DROP COLUMN "updated_at"');
    await queryRunner.query('ALTER TABLE "flanker_tests" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()');
    await queryRunner.query('ALTER TABLE "async_tasks" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "async_tasks" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TYPE "public"."async_task_status_enum" RENAME TO "async_task_status_enum_old"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"async_tasks_status_enum\" AS ENUM('pending', 'processing', 'completed', 'failed')",
    );
    await queryRunner.query('ALTER TABLE "async_tasks" ALTER COLUMN "status" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "async_tasks" ALTER COLUMN "status" TYPE "public"."async_tasks_status_enum" USING "status"::"text"::"public"."async_tasks_status_enum"',
    );
    await queryRunner.query('ALTER TABLE "async_tasks" ALTER COLUMN "status" SET DEFAULT \'pending\'');
    await queryRunner.query('DROP TYPE "public"."async_task_status_enum_old"');
    await queryRunner.query('ALTER TYPE "public"."operating_systems" RENAME TO "operating_systems_old"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"app_versions_operating_system_enum\" AS ENUM('MacOS', 'Windows', 'Android', 'iOS', 'Web', 'Unknown')",
    );
    await queryRunner.query(
      'ALTER TABLE "app_versions" ALTER COLUMN "operating_system" TYPE "public"."app_versions_operating_system_enum" USING "operating_system"::"text"::"public"."app_versions_operating_system_enum"',
    );
    await queryRunner.query('DROP TYPE "public"."operating_systems_old"');
    await queryRunner.query('ALTER TYPE "public"."announcement_type_enum" RENAME TO "announcement_type_enum_old"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"announcements_type_enum\" AS ENUM('release', 'event', 'survey', 'maintenance')",
    );
    await queryRunner.query(
      'ALTER TABLE "announcements" ALTER COLUMN "type" TYPE "public"."announcements_type_enum" USING "type"::"text"::"public"."announcements_type_enum"',
    );
    await queryRunner.query('DROP TYPE "public"."announcement_type_enum_old"');
    await queryRunner.query(
      'ALTER TYPE "public"."announcement_priority_enum" RENAME TO "announcement_priority_enum_old"',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"announcements_priority_enum\" AS ENUM('low', 'medium', 'high', 'critical')",
    );
    await queryRunner.query('ALTER TABLE "announcements" ALTER COLUMN "priority" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "announcements" ALTER COLUMN "priority" TYPE "public"."announcements_priority_enum" USING "priority"::"text"::"public"."announcements_priority_enum"',
    );
    await queryRunner.query('ALTER TABLE "announcements" ALTER COLUMN "priority" SET DEFAULT \'medium\'');
    await queryRunner.query('DROP TYPE "public"."announcement_priority_enum_old"');
    await queryRunner.query(
      'ALTER TYPE "public"."announcement_operating_system_enum" RENAME TO "announcement_operating_system_enum_old"',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"announcements_operating_system_enum\" AS ENUM('MacOS', 'Windows', 'Android', 'iOS', 'Web', 'Unknown')",
    );
    await queryRunner.query('ALTER TABLE "announcements" ALTER COLUMN "operating_system" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "announcements" ALTER COLUMN "operating_system" TYPE "public"."announcements_operating_system_enum" USING "operating_system"::"text"::"public"."announcements_operating_system_enum"',
    );
    await queryRunner.query('ALTER TABLE "announcements" ALTER COLUMN "operating_system" SET DEFAULT \'Unknown\'');
    await queryRunner.query('DROP TYPE "public"."announcement_operating_system_enum_old"');
    await queryRunner.query('ALTER TYPE "public"."view_action_enum" RENAME TO "view_action_enum_old"');
    await queryRunner.query('CREATE TYPE "public"."announcement_views_action_enum" AS ENUM(\'viewed\', \'dismissed\')');
    await queryRunner.query('ALTER TABLE "announcement_views" ALTER COLUMN "action" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "announcement_views" ALTER COLUMN "action" TYPE "public"."announcement_views_action_enum" USING "action"::"text"::"public"."announcement_views_action_enum"',
    );
    await queryRunner.query('ALTER TABLE "announcement_views" ALTER COLUMN "action" SET DEFAULT \'viewed\'');
    await queryRunner.query('DROP TYPE "public"."view_action_enum_old"');
    await queryRunner.query('ALTER TABLE "task_comment_reactions" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "task_comment_reactions" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "task_comments" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "task_comments" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "task_attachments" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "task_attachments" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "comment_attachments" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "comment_attachments" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "task_reactions" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "task_reactions" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "note_tags" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "note_tags" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "notes" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "notes" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "webhook_subscriptions" ALTER COLUMN "created_at" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "webhook_subscriptions" ALTER COLUMN "updated_at" DROP DEFAULT');
    await queryRunner.query('ALTER TYPE "public"."webhook_event_type_enum" RENAME TO "webhook_event_type_enum_old"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"webhook_subscriptions_event_types_enum\" AS ENUM('habit.completed', 'routine.completed', 'focus_session.started', 'focus_session.completed', 'break.started', 'break.completed')",
    );
    await queryRunner.query(
      'ALTER TABLE "webhook_subscriptions" ALTER COLUMN "event_types" TYPE "public"."webhook_subscriptions_event_types_enum"[] USING "event_types"::"text"::"public"."webhook_subscriptions_event_types_enum"[]',
    );
    await queryRunner.query('DROP TYPE "public"."webhook_event_type_enum_old"');
    await queryRunner.query(
      'CREATE INDEX "IDX_9556d5ea70ef3e478b006e6d7e" ON "completed_activity_sequences" ("is_completed") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_fadb0c4b276a354163f33b59d7" ON "tutorials" ("activity_id") ');
    await queryRunner.query('CREATE INDEX "IDX_313f1f8de820017174bba9a37e" ON "tutorials" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_9f026abf577dbec095417ceed1" ON "tutorials" ("activity_template_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_f7c4e8cc49ace1d2a0ca45ce0a" ON "activity_template_tag" ("activity_template_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_d50f8a2070351d227e754929d8" ON "activity_template_embedding" ("activity_template_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_761beb7565ea9016bff94ec0dc" ON "geofences" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_ea08bf89733b10d96f081c354f" ON "activities" ("geofence_id") ');
    await queryRunner.query('CREATE INDEX "IDX_e446913dffe9ab2cc8fa6312fb" ON "custom_routines" ("trigger") ');
    await queryRunner.query('CREATE INDEX "IDX_3e9a19b791a77ae63c92181563" ON "custom_routines" ("start_time") ');
    await queryRunner.query('CREATE INDEX "IDX_314e0cc62c80ce1e8e54723ba7" ON "custom_routines" ("end_time") ');
    await queryRunner.query('CREATE INDEX "IDX_7bc5516f3df651be81b8c143ab" ON "custom_routines" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_4fa4dbb788b2cbb4e551db3a8e" ON "activity_sequences" ("custom_routine_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_d18538bdd3f02b1c872b01371b" ON "devices" ("operating_system") ');
    await queryRunner.query('CREATE INDEX "IDX_03a15439248d3afd94fbf321dc" ON "devices" ("is_leader") ');
    await queryRunner.query('CREATE INDEX "IDX_2ea23ba670d16732a35d66a15c" ON "devices" ("app_version") ');
    await queryRunner.query('CREATE INDEX "IDX_b5729113570c20c7e214cf3f58" ON "project_members" ("project_id") ');
    await queryRunner.query('CREATE INDEX "IDX_e89aae80e010c2faa72e6a49ce" ON "project_members" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_aab2cb778924533725fee524b8" ON "project_members" ("email") ');
    await queryRunner.query('CREATE INDEX "IDX_b1bd2fbf5d0ef67319c91acb5c" ON "projects" ("owner_id") ');
    await queryRunner.query('CREATE INDEX "IDX_11b52372ea51f9159efe2402d9" ON "projects" ("deleted_at") ');
    await queryRunner.query('CREATE INDEX "IDX_1ba43c9c6d8a3c8e52bd6448fb" ON "to_do" ("project_id") ');
    await queryRunner.query('CREATE INDEX "IDX_7f866586d0fa1e893ec65d0463" ON "to_do" ("assignee_id") ');
    await queryRunner.query('CREATE INDEX "IDX_ae888d4c79453482a97e3f3715" ON "to_do" ("assigned_mcp_token_id") ');
    await queryRunner.query('CREATE INDEX "IDX_98ae9e51651c29c4eef550fc8e" ON "to_do" ("custom_status_id") ');
    await queryRunner.query('CREATE INDEX "IDX_537526c2b49d6d6c72841d2930" ON "blocking_schedules" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_b5502250421e2e2891ddb70f3a" ON "blocking_schedules" ("focus_mode_id") ');
    await queryRunner.query('CREATE INDEX "IDX_cbcb9374715cdb035bc7d91467" ON "team_to_member" ("team_id") ');
    await queryRunner.query('CREATE INDEX "IDX_3a5cc03baa6d3810061dddb766" ON "team_to_member" ("member_id") ');
    await queryRunner.query('CREATE INDEX "IDX_6798545bb42b829c6c8046d634" ON "team_to_member" ("email") ');
    await queryRunner.query('CREATE INDEX "IDX_17dbc728872dae46c72946c06b" ON "notifications" ("notification_type") ');
    await queryRunner.query('CREATE INDEX "IDX_1e465cab16c31698617e8f7c0d" ON "notifications" ("related_entity_id") ');
    await queryRunner.query('CREATE INDEX "IDX_33d079f4b105bf182b6e112b82" ON "impact_events" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_9c13d9639adb3b556179cf788a" ON "platform_integrations" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_85108d34400108381214a013cb" ON "platform_integrations" ("platform") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_8b363e5bac31a2cc04a8d5a0e1" ON "platform_integrations" ("external_user_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_365d380f7ebbd9005558745f42" ON "calendar_excluded_keywords" ("user_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_baf8690eea3928bf4fe59c2141" ON "calendars" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_df725356eab900c1f44af1885f" ON "unlock_requests" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_8d2fb8ceb34eb517efb0f67465" ON "unlock_requests" ("accountability_buddy_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_6719e28601271231c9d5bb423e" ON "unlock_requests" ("status") ');
    await queryRunner.query('CREATE INDEX "IDX_4deb4821ceb403415b4011a639" ON "accountability_buddy" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_4ee6cab6530f4c1b5265926f4f" ON "accountability_buddy" ("buddy_user_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_8853ab735ecfd212e660ca22f5" ON "accountability_buddy" ("buddy_email") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_757242b6886ef6edd744761778" ON "accountability_buddy" ("invitation_status") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_4334f6be2d7d841a9d5205a100" ON "feedbacks" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_e0af7eabe6ab3633e8d1673cea" ON "external_api_tokens" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_80be1fb61a90b540e09ff4c6ce" ON "external_api_tokens" ("token_prefix") ');
    await queryRunner.query('CREATE INDEX "IDX_bde06f3a79d0442b4d3433d1c3" ON "lesson-completions" ("lesson_id") ');
    await queryRunner.query('CREATE INDEX "IDX_abe16f17255a9b4ce4548b2732" ON "lesson-completions" ("course_id") ');
    await queryRunner.query('CREATE INDEX "IDX_bae11bc8d1886cc2b1be03c409" ON "lesson-completions" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_31cf65fe92a6755fac7ef7c566" ON "courses" ("platform") ');
    await queryRunner.query('CREATE INDEX "IDX_d3526a69ee7f01d352ba7c3004" ON "team_join_codes" ("team_id") ');
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_1ffcaa9ffdd4183895c928c0c5" ON "team_join_codes" ("code") ');
    await queryRunner.query('CREATE INDEX "IDX_67dfc162f6cd281ce70e0a69e1" ON "survey" ("creator") ');
    await queryRunner.query('CREATE INDEX "IDX_ca5d0e0e096f8874883140eac9" ON "survey_answer" ("survey_id") ');
    await queryRunner.query('CREATE INDEX "IDX_01ddfd2d4da991cc49cd02e29c" ON "survey_answer" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_2d8e6f21eebd0596b371cc93e0" ON "survey_answer_metadata" ("survey_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_c463d824b378cd9e6bc04d07ae" ON "survey_answer_metadata" ("survey_answer_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_35f66f7410450d9a2845975a3f" ON "survey_answer_metadata" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_b6a002f432ebd403fb3fc95cd6" ON "habit_library_requests" ("user_id") ');
    await queryRunner.query(
      'CREATE UNIQUE INDEX "idx_usage_data_unique" ON "usage_data" ("user_id", "source_name", "usage_type", "usage_start_date", "usage_end_date") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_30f4bd1a70d77c974139f9dd88" ON "app_versions" ("operating_system") ');
    await queryRunner.query('CREATE INDEX "IDX_ef82a988760da3b4ab3f342255" ON "app_versions" ("is_supported") ');
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_f2026692192beef748a5043cd7" ON "app_versions" ("operating_system", "semver_string") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_529a516547799e1daf71ed1ee9" ON "announcement_views" ("user_id") ');
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_96578dc2848301434684b67616" ON "announcement_views" ("user_id", "announcement_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_5708378ae687024e7dbd03c3f0" ON "task_comment_reactions" ("comment_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_67a7eec26093a7233c61ee1b95" ON "task_comment_reactions" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_ba9e465cfc707006e60aae5994" ON "task_comments" ("task_id") ');
    await queryRunner.query('CREATE INDEX "IDX_07ff0d4347a198527663bda63d" ON "task_comments" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_8c07320adec50a39744a4a301d" ON "task_attachments" ("task_id") ');
    await queryRunner.query('CREATE INDEX "IDX_7736a9dc80658c9b85a97f832f" ON "task_attachments" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_e6df9a7f63a30fba38b1f613e1" ON "comment_attachments" ("comment_id") ');
    await queryRunner.query('CREATE INDEX "IDX_1fcb85d0cf58d069bbb58c6a39" ON "comment_attachments" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_0eaf6121322f37174b0190f102" ON "task_reactions" ("task_id") ');
    await queryRunner.query('CREATE INDEX "IDX_05afd459e7d5bbb90d7fd1b0bd" ON "task_reactions" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_bffb961e5cd19ef47e9a4ae19c" ON "note_tags" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_7708dcb62ff332f0eaf9f0743a" ON "notes" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_da4b25573567df4a563b468c44" ON "notes" ("completed_activity_id") ');
    await queryRunner.query('CREATE INDEX "IDX_56d0022083f41dadfd9c75a187" ON "webhook_subscriptions" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_058d5360e24ca52ca89762edc3" ON "notes_tags" ("note_id") ');
    await queryRunner.query('CREATE INDEX "IDX_875ccc1c28dbbdf374c546389c" ON "notes_tags" ("tag_id") ');
    await queryRunner.query('CREATE INDEX "IDX_fb1d9e42a9ecf9b0b778242676" ON "notes_todos" ("note_id") ');
    await queryRunner.query('CREATE INDEX "IDX_628ca5ba2632a4f1d79f55cb98" ON "notes_todos" ("todo_id") ');
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "unique_index_activity_id_completed_sequence_id" UNIQUE ("activity_id", "completed_sequence_id")',
    );
    await queryRunner.query(
      'ALTER TABLE "course_enrolments" ADD CONSTRAINT "UQ_5e3a60c542135570b1da1fb0a17" UNIQUE ("user_id", "course_id")',
    );
    await queryRunner.query(
      'ALTER TABLE "task_comment_reactions" ADD CONSTRAINT "UQ_4ef36aec606e86369ccb696cb98" UNIQUE ("comment_id", "user_id", "emoji")',
    );
    await queryRunner.query(
      'ALTER TABLE "note_tags" ADD CONSTRAINT "UQ_note_tags_user_id_text" UNIQUE ("user_id", "text")',
    );
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ADD CONSTRAINT "FK_7c09b7133924634d328ea96398e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ADD CONSTRAINT "FK_f2fc1124527683faa88f1bde15f" FOREIGN KEY ("break_sequence_log_id") REFERENCES "completed_activity_sequences"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" ADD CONSTRAINT "FK_0672e8970f2bdebee79f4268254" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" ADD CONSTRAINT "FK_cb520c9fab7e274b4bd190f3016" FOREIGN KEY ("activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_packs" ADD CONSTRAINT "FK_634d333e9adb5d90a96aeffdd46" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_packs" ADD CONSTRAINT "FK_9c3607b832d303ccf87bcb9f00b" FOREIGN KEY ("pack_id") REFERENCES "habit_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "habit_packs" ADD CONSTRAINT "FK_c78642e7a487983c6eef72ab977" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "tutorials" ADD CONSTRAINT "FK_fadb0c4b276a354163f33b59d7e" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "tutorials" ADD CONSTRAINT "FK_9f026abf577dbec095417ceed1a" FOREIGN KEY ("activity_template_id") REFERENCES "activity_template"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_template_tag" ADD CONSTRAINT "FK_f7c4e8cc49ace1d2a0ca45ce0a3" FOREIGN KEY ("activity_template_id") REFERENCES "activity_template"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_template_embedding" ADD CONSTRAINT "FK_d50f8a2070351d227e754929d83" FOREIGN KEY ("activity_template_id") REFERENCES "activity_template"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_template" ADD CONSTRAINT "FK_b4153d8eb28b96ba7e7456c9dec" FOREIGN KEY ("parent_id") REFERENCES "activity_template"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_template" ADD CONSTRAINT "FK_164ed73d380a84065291f14b587" FOREIGN KEY ("pack_id") REFERENCES "habit_packs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_template" ADD CONSTRAINT "FK_812680d65acf98b56f5ee4d0513" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "FK_8e655b7aaf5014e0cd9d7bc472c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "FK_0140c854ae5304f6546171332b6" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "FK_912820036acd64c083c3f7671b5" FOREIGN KEY ("activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "FK_275037203433cfef2b5c1e62bd2" FOREIGN KEY ("completed_sequence_id") REFERENCES "completed_activity_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "geofences" ADD CONSTRAINT "FK_761beb7565ea9016bff94ec0dce" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "geofences" ADD CONSTRAINT "FK_74ace9917e359fb664d3f675e70" FOREIGN KEY ("associated_routine_id") REFERENCES "activity_sequences"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ADD CONSTRAINT "FK_ea08bf89733b10d96f081c354f0" FOREIGN KEY ("geofence_id") REFERENCES "geofences"("id") ON DELETE SET NULL ON UPDATE CASCADE',
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
      'ALTER TABLE "activities" ADD CONSTRAINT "FK_62b1bed769a3fa8d7f2bacf948c" FOREIGN KEY ("activity_template_id") REFERENCES "activity_template"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "custom_routines" ADD CONSTRAINT "FK_7bc5516f3df651be81b8c143abb" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_sequences" ADD CONSTRAINT "FK_4fa4dbb788b2cbb4e551db3a8ee" FOREIGN KEY ("custom_routine_id") REFERENCES "custom_routines"("id") ON DELETE SET NULL ON UPDATE CASCADE',
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
      'ALTER TABLE "project_members" ADD CONSTRAINT "FK_b5729113570c20c7e214cf3f58d" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "project_members" ADD CONSTRAINT "FK_e89aae80e010c2faa72e6a49ce8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "projects" ADD CONSTRAINT "FK_b1bd2fbf5d0ef67319c91acb5cf" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "to_do" ADD CONSTRAINT "FK_1ba43c9c6d8a3c8e52bd6448fb7" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "to_do" ADD CONSTRAINT "FK_7f866586d0fa1e893ec65d04631" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_focus_blocks" ADD CONSTRAINT "FK_e07f494fb6be4bd758fd6bcb8d6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_focus_blocks" ADD CONSTRAINT "FK_1b5cd35b5bdda454fd7ae27b2a9" FOREIGN KEY ("focus_mode_id") REFERENCES "focus_modes"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "blocking_schedules" ADD CONSTRAINT "FK_537526c2b49d6d6c72841d29301" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "blocking_schedules" ADD CONSTRAINT "FK_b5502250421e2e2891ddb70f3a0" FOREIGN KEY ("focus_mode_id") REFERENCES "focus_modes"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "focus_modes" ADD CONSTRAINT "FK_8c944861e1793cb9a4da0fb04c8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "focus_modes" ADD CONSTRAINT "FK_9d1b45fc85df3dab66ecf525e33" FOREIGN KEY ("focus_mode_template_id") REFERENCES "focus_mode_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "user_consent" ADD CONSTRAINT "FK_4174e45dd98eb587c2348b8ca1d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "impact_events" ADD CONSTRAINT "FK_33d079f4b105bf182b6e112b821" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "calendar_excluded_keywords" ADD CONSTRAINT "FK_365d380f7ebbd9005558745f429" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "calendars" ADD CONSTRAINT "FK_baf8690eea3928bf4fe59c21414" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "unlock_requests" ADD CONSTRAINT "FK_df725356eab900c1f44af1885f1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "unlock_requests" ADD CONSTRAINT "FK_8d2fb8ceb34eb517efb0f674659" FOREIGN KEY ("accountability_buddy_id") REFERENCES "accountability_buddy"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "accountability_buddy" ADD CONSTRAINT "FK_4deb4821ceb403415b4011a639a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "accountability_buddy" ADD CONSTRAINT "FK_4ee6cab6530f4c1b5265926f4f6" FOREIGN KEY ("buddy_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_24f35ae7290dee881590641795d" FOREIGN KEY ("signed_up_via_habit_pack") REFERENCES "habit_packs"("id") ON DELETE NO ACTION ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_571efd35d4486a3d8d876bd9f78" FOREIGN KEY ("current_completing_sequence_log_id") REFERENCES "completed_activity_sequences"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_16bcf73d1900d2a3061edbeef55" FOREIGN KEY ("current_completing_focus_block_id") REFERENCES "completed_focus_blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_975fdeac7998e0b535c84097a65" FOREIGN KEY ("current_focus_mode_id") REFERENCES "focus_modes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "feedbacks" ADD CONSTRAINT "FK_4334f6be2d7d841a9d5205a100e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "external_api_tokens" ADD CONSTRAINT "FK_e0af7eabe6ab3633e8d1673cead" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "lessons" ADD CONSTRAINT "FK_3c4e299cf8ed04093935e2e22fe" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "course_ratings" ADD CONSTRAINT "FK_32b68ae69d8fb9200a854d6b331" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "course_ratings" ADD CONSTRAINT "FK_01519cb0eb5e5a294938c012ef1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "lesson-completions" ADD CONSTRAINT "FK_bde06f3a79d0442b4d3433d1c3c" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "lesson-completions" ADD CONSTRAINT "FK_abe16f17255a9b4ce4548b27328" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "lesson-completions" ADD CONSTRAINT "FK_bae11bc8d1886cc2b1be03c4090" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "course_enrolments" ADD CONSTRAINT "FK_ce42bd84fedc0c4024ef19954b3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "course_enrolments" ADD CONSTRAINT "FK_96e267f170e2d4ff4eb70b88101" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "courses" ADD CONSTRAINT "FK_cce7a734fa75f9f3051c50d3283" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "admin_access_requests" ADD CONSTRAINT "FK_7e4952c93107f80cbfb967c9f30" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "team_join_codes" ADD CONSTRAINT "FK_d3526a69ee7f01d352ba7c3004a" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "survey" ADD CONSTRAINT "FK_67dfc162f6cd281ce70e0a69e1a" FOREIGN KEY ("creator") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "survey_answer" ADD CONSTRAINT "FK_ca5d0e0e096f8874883140eac9c" FOREIGN KEY ("survey_id") REFERENCES "survey"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "survey_answer" ADD CONSTRAINT "FK_01ddfd2d4da991cc49cd02e29c2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "survey_answer_metadata" ADD CONSTRAINT "FK_2d8e6f21eebd0596b371cc93e0e" FOREIGN KEY ("survey_id") REFERENCES "survey"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "survey_answer_metadata" ADD CONSTRAINT "FK_35f66f7410450d9a2845975a3fa" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "survey_answer_metadata" ADD CONSTRAINT "FK_c463d824b378cd9e6bc04d07ae1" FOREIGN KEY ("survey_answer_id") REFERENCES "survey_answer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "habit_library_requests" ADD CONSTRAINT "FK_b6a002f432ebd403fb3fc95cd66" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "flanker_tests" ADD CONSTRAINT "FK_c65a5dc9ae64930923ce36b1681" FOREIGN KEY ("study_participant_id") REFERENCES "study_participants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "announcement_views" ADD CONSTRAINT "FK_b7ee5482463dd7f3ea97183fc31" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "task_comment_reactions" ADD CONSTRAINT "FK_5708378ae687024e7dbd03c3f08" FOREIGN KEY ("comment_id") REFERENCES "task_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "task_comment_reactions" ADD CONSTRAINT "FK_67a7eec26093a7233c61ee1b953" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "task_reactions" ADD CONSTRAINT "FK_0eaf6121322f37174b0190f102d" FOREIGN KEY ("task_id") REFERENCES "to_do"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "task_reactions" ADD CONSTRAINT "FK_05afd459e7d5bbb90d7fd1b0bd3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "note_tags" ADD CONSTRAINT "FK_bffb961e5cd19ef47e9a4ae19c5" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "notes" ADD CONSTRAINT "FK_7708dcb62ff332f0eaf9f0743a7" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "notes" ADD CONSTRAINT "FK_da4b25573567df4a563b468c441" FOREIGN KEY ("completed_activity_id") REFERENCES "completed_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "FK_56d0022083f41dadfd9c75a187f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "notes_tags" ADD CONSTRAINT "FK_058d5360e24ca52ca89762edc38" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "notes_tags" ADD CONSTRAINT "FK_875ccc1c28dbbdf374c546389ca" FOREIGN KEY ("tag_id") REFERENCES "note_tags"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "notes_todos" ADD CONSTRAINT "FK_fb1d9e42a9ecf9b0b778242676c" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "notes_todos" ADD CONSTRAINT "FK_628ca5ba2632a4f1d79f55cb988" FOREIGN KEY ("todo_id") REFERENCES "to_do"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "notes_todos" DROP CONSTRAINT "FK_628ca5ba2632a4f1d79f55cb988"');
    await queryRunner.query('ALTER TABLE "notes_todos" DROP CONSTRAINT "FK_fb1d9e42a9ecf9b0b778242676c"');
    await queryRunner.query('ALTER TABLE "notes_tags" DROP CONSTRAINT "FK_875ccc1c28dbbdf374c546389ca"');
    await queryRunner.query('ALTER TABLE "notes_tags" DROP CONSTRAINT "FK_058d5360e24ca52ca89762edc38"');
    await queryRunner.query('ALTER TABLE "webhook_subscriptions" DROP CONSTRAINT "FK_56d0022083f41dadfd9c75a187f"');
    await queryRunner.query('ALTER TABLE "notes" DROP CONSTRAINT "FK_da4b25573567df4a563b468c441"');
    await queryRunner.query('ALTER TABLE "notes" DROP CONSTRAINT "FK_7708dcb62ff332f0eaf9f0743a7"');
    await queryRunner.query('ALTER TABLE "note_tags" DROP CONSTRAINT "FK_bffb961e5cd19ef47e9a4ae19c5"');
    await queryRunner.query('ALTER TABLE "task_reactions" DROP CONSTRAINT "FK_05afd459e7d5bbb90d7fd1b0bd3"');
    await queryRunner.query('ALTER TABLE "task_reactions" DROP CONSTRAINT "FK_0eaf6121322f37174b0190f102d"');
    await queryRunner.query('ALTER TABLE "task_comment_reactions" DROP CONSTRAINT "FK_67a7eec26093a7233c61ee1b953"');
    await queryRunner.query('ALTER TABLE "task_comment_reactions" DROP CONSTRAINT "FK_5708378ae687024e7dbd03c3f08"');
    await queryRunner.query('ALTER TABLE "announcement_views" DROP CONSTRAINT "FK_b7ee5482463dd7f3ea97183fc31"');
    await queryRunner.query('ALTER TABLE "flanker_tests" DROP CONSTRAINT "FK_c65a5dc9ae64930923ce36b1681"');
    await queryRunner.query('ALTER TABLE "habit_library_requests" DROP CONSTRAINT "FK_b6a002f432ebd403fb3fc95cd66"');
    await queryRunner.query('ALTER TABLE "survey_answer_metadata" DROP CONSTRAINT "FK_c463d824b378cd9e6bc04d07ae1"');
    await queryRunner.query('ALTER TABLE "survey_answer_metadata" DROP CONSTRAINT "FK_35f66f7410450d9a2845975a3fa"');
    await queryRunner.query('ALTER TABLE "survey_answer_metadata" DROP CONSTRAINT "FK_2d8e6f21eebd0596b371cc93e0e"');
    await queryRunner.query('ALTER TABLE "survey_answer" DROP CONSTRAINT "FK_01ddfd2d4da991cc49cd02e29c2"');
    await queryRunner.query('ALTER TABLE "survey_answer" DROP CONSTRAINT "FK_ca5d0e0e096f8874883140eac9c"');
    await queryRunner.query('ALTER TABLE "survey" DROP CONSTRAINT "FK_67dfc162f6cd281ce70e0a69e1a"');
    await queryRunner.query('ALTER TABLE "team_join_codes" DROP CONSTRAINT "FK_d3526a69ee7f01d352ba7c3004a"');
    await queryRunner.query('ALTER TABLE "admin_access_requests" DROP CONSTRAINT "FK_7e4952c93107f80cbfb967c9f30"');
    await queryRunner.query('ALTER TABLE "courses" DROP CONSTRAINT "FK_cce7a734fa75f9f3051c50d3283"');
    await queryRunner.query('ALTER TABLE "course_enrolments" DROP CONSTRAINT "FK_96e267f170e2d4ff4eb70b88101"');
    await queryRunner.query('ALTER TABLE "course_enrolments" DROP CONSTRAINT "FK_ce42bd84fedc0c4024ef19954b3"');
    await queryRunner.query('ALTER TABLE "lesson-completions" DROP CONSTRAINT "FK_bae11bc8d1886cc2b1be03c4090"');
    await queryRunner.query('ALTER TABLE "lesson-completions" DROP CONSTRAINT "FK_abe16f17255a9b4ce4548b27328"');
    await queryRunner.query('ALTER TABLE "lesson-completions" DROP CONSTRAINT "FK_bde06f3a79d0442b4d3433d1c3c"');
    await queryRunner.query('ALTER TABLE "course_ratings" DROP CONSTRAINT "FK_01519cb0eb5e5a294938c012ef1"');
    await queryRunner.query('ALTER TABLE "course_ratings" DROP CONSTRAINT "FK_32b68ae69d8fb9200a854d6b331"');
    await queryRunner.query('ALTER TABLE "lessons" DROP CONSTRAINT "FK_3c4e299cf8ed04093935e2e22fe"');
    await queryRunner.query('ALTER TABLE "external_api_tokens" DROP CONSTRAINT "FK_e0af7eabe6ab3633e8d1673cead"');
    await queryRunner.query('ALTER TABLE "feedbacks" DROP CONSTRAINT "FK_4334f6be2d7d841a9d5205a100e"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_975fdeac7998e0b535c84097a65"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_16bcf73d1900d2a3061edbeef55"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_571efd35d4486a3d8d876bd9f78"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_24f35ae7290dee881590641795d"');
    await queryRunner.query('ALTER TABLE "accountability_buddy" DROP CONSTRAINT "FK_4ee6cab6530f4c1b5265926f4f6"');
    await queryRunner.query('ALTER TABLE "accountability_buddy" DROP CONSTRAINT "FK_4deb4821ceb403415b4011a639a"');
    await queryRunner.query('ALTER TABLE "unlock_requests" DROP CONSTRAINT "FK_8d2fb8ceb34eb517efb0f674659"');
    await queryRunner.query('ALTER TABLE "unlock_requests" DROP CONSTRAINT "FK_df725356eab900c1f44af1885f1"');
    await queryRunner.query('ALTER TABLE "calendars" DROP CONSTRAINT "FK_baf8690eea3928bf4fe59c21414"');
    await queryRunner.query(
      'ALTER TABLE "calendar_excluded_keywords" DROP CONSTRAINT "FK_365d380f7ebbd9005558745f429"',
    );
    await queryRunner.query('ALTER TABLE "impact_events" DROP CONSTRAINT "FK_33d079f4b105bf182b6e112b821"');
    await queryRunner.query('ALTER TABLE "user_consent" DROP CONSTRAINT "FK_4174e45dd98eb587c2348b8ca1d"');
    await queryRunner.query('ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"');
    await queryRunner.query('ALTER TABLE "focus_modes" DROP CONSTRAINT "FK_9d1b45fc85df3dab66ecf525e33"');
    await queryRunner.query('ALTER TABLE "focus_modes" DROP CONSTRAINT "FK_8c944861e1793cb9a4da0fb04c8"');
    await queryRunner.query('ALTER TABLE "blocking_schedules" DROP CONSTRAINT "FK_b5502250421e2e2891ddb70f3a0"');
    await queryRunner.query('ALTER TABLE "blocking_schedules" DROP CONSTRAINT "FK_537526c2b49d6d6c72841d29301"');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" DROP CONSTRAINT "FK_1b5cd35b5bdda454fd7ae27b2a9"');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" DROP CONSTRAINT "FK_e07f494fb6be4bd758fd6bcb8d6"');
    await queryRunner.query('ALTER TABLE "to_do" DROP CONSTRAINT "FK_7f866586d0fa1e893ec65d04631"');
    await queryRunner.query('ALTER TABLE "to_do" DROP CONSTRAINT "FK_1ba43c9c6d8a3c8e52bd6448fb7"');
    await queryRunner.query('ALTER TABLE "projects" DROP CONSTRAINT "FK_b1bd2fbf5d0ef67319c91acb5cf"');
    await queryRunner.query('ALTER TABLE "project_members" DROP CONSTRAINT "FK_e89aae80e010c2faa72e6a49ce8"');
    await queryRunner.query('ALTER TABLE "project_members" DROP CONSTRAINT "FK_b5729113570c20c7e214cf3f58d"');
    await queryRunner.query(
      'ALTER TABLE "installed_focus_mode_templates" DROP CONSTRAINT "FK_811874df684c60b8720047d86fb"',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_focus_mode_templates" DROP CONSTRAINT "FK_9794613b59be7595599b692c48e"',
    );
    await queryRunner.query('ALTER TABLE "devices" DROP CONSTRAINT "FK_5e9bee993b4ce35c3606cda194c"');
    await queryRunner.query('ALTER TABLE "activity_sequences" DROP CONSTRAINT "FK_4fa4dbb788b2cbb4e551db3a8ee"');
    await queryRunner.query('ALTER TABLE "custom_routines" DROP CONSTRAINT "FK_7bc5516f3df651be81b8c143abb"');
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "FK_62b1bed769a3fa8d7f2bacf948c"');
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "FK_b82f1d8368dd5305ae7e7e664c2"');
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "FK_797b2408833193b3a5fd0216f42"');
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "FK_55fe1e1514a9f21cf7e5b46d8b0"');
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "FK_ea08bf89733b10d96f081c354f0"');
    await queryRunner.query('ALTER TABLE "geofences" DROP CONSTRAINT "FK_74ace9917e359fb664d3f675e70"');
    await queryRunner.query('ALTER TABLE "geofences" DROP CONSTRAINT "FK_761beb7565ea9016bff94ec0dce"');
    await queryRunner.query('ALTER TABLE "completed_activities" DROP CONSTRAINT "FK_275037203433cfef2b5c1e62bd2"');
    await queryRunner.query('ALTER TABLE "completed_activities" DROP CONSTRAINT "FK_912820036acd64c083c3f7671b5"');
    await queryRunner.query('ALTER TABLE "completed_activities" DROP CONSTRAINT "FK_0140c854ae5304f6546171332b6"');
    await queryRunner.query('ALTER TABLE "completed_activities" DROP CONSTRAINT "FK_8e655b7aaf5014e0cd9d7bc472c"');
    await queryRunner.query('ALTER TABLE "activity_template" DROP CONSTRAINT "FK_812680d65acf98b56f5ee4d0513"');
    await queryRunner.query('ALTER TABLE "activity_template" DROP CONSTRAINT "FK_164ed73d380a84065291f14b587"');
    await queryRunner.query('ALTER TABLE "activity_template" DROP CONSTRAINT "FK_b4153d8eb28b96ba7e7456c9dec"');
    await queryRunner.query(
      'ALTER TABLE "activity_template_embedding" DROP CONSTRAINT "FK_d50f8a2070351d227e754929d83"',
    );
    await queryRunner.query('ALTER TABLE "activity_template_tag" DROP CONSTRAINT "FK_f7c4e8cc49ace1d2a0ca45ce0a3"');
    await queryRunner.query('ALTER TABLE "tutorials" DROP CONSTRAINT "FK_9f026abf577dbec095417ceed1a"');
    await queryRunner.query('ALTER TABLE "tutorials" DROP CONSTRAINT "FK_fadb0c4b276a354163f33b59d7e"');
    await queryRunner.query('ALTER TABLE "habit_packs" DROP CONSTRAINT "FK_c78642e7a487983c6eef72ab977"');
    await queryRunner.query('ALTER TABLE "installed_packs" DROP CONSTRAINT "FK_9c3607b832d303ccf87bcb9f00b"');
    await queryRunner.query('ALTER TABLE "installed_packs" DROP CONSTRAINT "FK_634d333e9adb5d90a96aeffdd46"');
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" DROP CONSTRAINT "FK_cb520c9fab7e274b4bd190f3016"',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" DROP CONSTRAINT "FK_0672e8970f2bdebee79f4268254"',
    );
    await queryRunner.query('ALTER TABLE "daily_stats" DROP CONSTRAINT "FK_f2fc1124527683faa88f1bde15f"');
    await queryRunner.query('ALTER TABLE "daily_stats" DROP CONSTRAINT "FK_7c09b7133924634d328ea96398e"');
    await queryRunner.query('ALTER TABLE "note_tags" DROP CONSTRAINT "UQ_note_tags_user_id_text"');
    await queryRunner.query('ALTER TABLE "task_comment_reactions" DROP CONSTRAINT "UQ_4ef36aec606e86369ccb696cb98"');
    await queryRunner.query('ALTER TABLE "course_enrolments" DROP CONSTRAINT "UQ_5e3a60c542135570b1da1fb0a17"');
    await queryRunner.query(
      'ALTER TABLE "completed_activities" DROP CONSTRAINT "unique_index_activity_id_completed_sequence_id"',
    );
    await queryRunner.query('DROP INDEX "public"."IDX_628ca5ba2632a4f1d79f55cb98"');
    await queryRunner.query('DROP INDEX "public"."IDX_fb1d9e42a9ecf9b0b778242676"');
    await queryRunner.query('DROP INDEX "public"."IDX_875ccc1c28dbbdf374c546389c"');
    await queryRunner.query('DROP INDEX "public"."IDX_058d5360e24ca52ca89762edc3"');
    await queryRunner.query('DROP INDEX "public"."IDX_56d0022083f41dadfd9c75a187"');
    await queryRunner.query('DROP INDEX "public"."IDX_da4b25573567df4a563b468c44"');
    await queryRunner.query('DROP INDEX "public"."IDX_7708dcb62ff332f0eaf9f0743a"');
    await queryRunner.query('DROP INDEX "public"."IDX_bffb961e5cd19ef47e9a4ae19c"');
    await queryRunner.query('DROP INDEX "public"."IDX_05afd459e7d5bbb90d7fd1b0bd"');
    await queryRunner.query('DROP INDEX "public"."IDX_0eaf6121322f37174b0190f102"');
    await queryRunner.query('DROP INDEX "public"."IDX_1fcb85d0cf58d069bbb58c6a39"');
    await queryRunner.query('DROP INDEX "public"."IDX_e6df9a7f63a30fba38b1f613e1"');
    await queryRunner.query('DROP INDEX "public"."IDX_7736a9dc80658c9b85a97f832f"');
    await queryRunner.query('DROP INDEX "public"."IDX_8c07320adec50a39744a4a301d"');
    await queryRunner.query('DROP INDEX "public"."IDX_07ff0d4347a198527663bda63d"');
    await queryRunner.query('DROP INDEX "public"."IDX_ba9e465cfc707006e60aae5994"');
    await queryRunner.query('DROP INDEX "public"."IDX_67a7eec26093a7233c61ee1b95"');
    await queryRunner.query('DROP INDEX "public"."IDX_5708378ae687024e7dbd03c3f0"');
    await queryRunner.query('DROP INDEX "public"."IDX_96578dc2848301434684b67616"');
    await queryRunner.query('DROP INDEX "public"."IDX_529a516547799e1daf71ed1ee9"');
    await queryRunner.query('DROP INDEX "public"."IDX_f2026692192beef748a5043cd7"');
    await queryRunner.query('DROP INDEX "public"."IDX_ef82a988760da3b4ab3f342255"');
    await queryRunner.query('DROP INDEX "public"."IDX_30f4bd1a70d77c974139f9dd88"');
    await queryRunner.query('DROP INDEX "public"."idx_usage_data_unique"');
    await queryRunner.query('DROP INDEX "public"."IDX_b6a002f432ebd403fb3fc95cd6"');
    await queryRunner.query('DROP INDEX "public"."IDX_35f66f7410450d9a2845975a3f"');
    await queryRunner.query('DROP INDEX "public"."IDX_c463d824b378cd9e6bc04d07ae"');
    await queryRunner.query('DROP INDEX "public"."IDX_2d8e6f21eebd0596b371cc93e0"');
    await queryRunner.query('DROP INDEX "public"."IDX_01ddfd2d4da991cc49cd02e29c"');
    await queryRunner.query('DROP INDEX "public"."IDX_ca5d0e0e096f8874883140eac9"');
    await queryRunner.query('DROP INDEX "public"."IDX_67dfc162f6cd281ce70e0a69e1"');
    await queryRunner.query('DROP INDEX "public"."IDX_1ffcaa9ffdd4183895c928c0c5"');
    await queryRunner.query('DROP INDEX "public"."IDX_d3526a69ee7f01d352ba7c3004"');
    await queryRunner.query('DROP INDEX "public"."IDX_31cf65fe92a6755fac7ef7c566"');
    await queryRunner.query('DROP INDEX "public"."IDX_bae11bc8d1886cc2b1be03c409"');
    await queryRunner.query('DROP INDEX "public"."IDX_abe16f17255a9b4ce4548b2732"');
    await queryRunner.query('DROP INDEX "public"."IDX_bde06f3a79d0442b4d3433d1c3"');
    await queryRunner.query('DROP INDEX "public"."IDX_80be1fb61a90b540e09ff4c6ce"');
    await queryRunner.query('DROP INDEX "public"."IDX_e0af7eabe6ab3633e8d1673cea"');
    await queryRunner.query('DROP INDEX "public"."IDX_4334f6be2d7d841a9d5205a100"');
    await queryRunner.query('DROP INDEX "public"."IDX_757242b6886ef6edd744761778"');
    await queryRunner.query('DROP INDEX "public"."IDX_8853ab735ecfd212e660ca22f5"');
    await queryRunner.query('DROP INDEX "public"."IDX_4ee6cab6530f4c1b5265926f4f"');
    await queryRunner.query('DROP INDEX "public"."IDX_4deb4821ceb403415b4011a639"');
    await queryRunner.query('DROP INDEX "public"."IDX_6719e28601271231c9d5bb423e"');
    await queryRunner.query('DROP INDEX "public"."IDX_8d2fb8ceb34eb517efb0f67465"');
    await queryRunner.query('DROP INDEX "public"."IDX_df725356eab900c1f44af1885f"');
    await queryRunner.query('DROP INDEX "public"."IDX_baf8690eea3928bf4fe59c2141"');
    await queryRunner.query('DROP INDEX "public"."IDX_365d380f7ebbd9005558745f42"');
    await queryRunner.query('DROP INDEX "public"."IDX_8b363e5bac31a2cc04a8d5a0e1"');
    await queryRunner.query('DROP INDEX "public"."IDX_85108d34400108381214a013cb"');
    await queryRunner.query('DROP INDEX "public"."IDX_9c13d9639adb3b556179cf788a"');
    await queryRunner.query('DROP INDEX "public"."IDX_33d079f4b105bf182b6e112b82"');
    await queryRunner.query('DROP INDEX "public"."IDX_1e465cab16c31698617e8f7c0d"');
    await queryRunner.query('DROP INDEX "public"."IDX_17dbc728872dae46c72946c06b"');
    await queryRunner.query('DROP INDEX "public"."IDX_6798545bb42b829c6c8046d634"');
    await queryRunner.query('DROP INDEX "public"."IDX_3a5cc03baa6d3810061dddb766"');
    await queryRunner.query('DROP INDEX "public"."IDX_cbcb9374715cdb035bc7d91467"');
    await queryRunner.query('DROP INDEX "public"."IDX_b5502250421e2e2891ddb70f3a"');
    await queryRunner.query('DROP INDEX "public"."IDX_537526c2b49d6d6c72841d2930"');
    await queryRunner.query('DROP INDEX "public"."IDX_98ae9e51651c29c4eef550fc8e"');
    await queryRunner.query('DROP INDEX "public"."IDX_ae888d4c79453482a97e3f3715"');
    await queryRunner.query('DROP INDEX "public"."IDX_7f866586d0fa1e893ec65d0463"');
    await queryRunner.query('DROP INDEX "public"."IDX_1ba43c9c6d8a3c8e52bd6448fb"');
    await queryRunner.query('DROP INDEX "public"."IDX_11b52372ea51f9159efe2402d9"');
    await queryRunner.query('DROP INDEX "public"."IDX_b1bd2fbf5d0ef67319c91acb5c"');
    await queryRunner.query('DROP INDEX "public"."IDX_aab2cb778924533725fee524b8"');
    await queryRunner.query('DROP INDEX "public"."IDX_e89aae80e010c2faa72e6a49ce"');
    await queryRunner.query('DROP INDEX "public"."IDX_b5729113570c20c7e214cf3f58"');
    await queryRunner.query('DROP INDEX "public"."IDX_2ea23ba670d16732a35d66a15c"');
    await queryRunner.query('DROP INDEX "public"."IDX_03a15439248d3afd94fbf321dc"');
    await queryRunner.query('DROP INDEX "public"."IDX_d18538bdd3f02b1c872b01371b"');
    await queryRunner.query('DROP INDEX "public"."IDX_4fa4dbb788b2cbb4e551db3a8e"');
    await queryRunner.query('DROP INDEX "public"."IDX_7bc5516f3df651be81b8c143ab"');
    await queryRunner.query('DROP INDEX "public"."IDX_314e0cc62c80ce1e8e54723ba7"');
    await queryRunner.query('DROP INDEX "public"."IDX_3e9a19b791a77ae63c92181563"');
    await queryRunner.query('DROP INDEX "public"."IDX_e446913dffe9ab2cc8fa6312fb"');
    await queryRunner.query('DROP INDEX "public"."IDX_ea08bf89733b10d96f081c354f"');
    await queryRunner.query('DROP INDEX "public"."IDX_761beb7565ea9016bff94ec0dc"');
    await queryRunner.query('DROP INDEX "public"."IDX_d50f8a2070351d227e754929d8"');
    await queryRunner.query('DROP INDEX "public"."IDX_f7c4e8cc49ace1d2a0ca45ce0a"');
    await queryRunner.query('DROP INDEX "public"."IDX_9f026abf577dbec095417ceed1"');
    await queryRunner.query('DROP INDEX "public"."IDX_313f1f8de820017174bba9a37e"');
    await queryRunner.query('DROP INDEX "public"."IDX_fadb0c4b276a354163f33b59d7"');
    await queryRunner.query('DROP INDEX "public"."IDX_9556d5ea70ef3e478b006e6d7e"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"webhook_event_type_enum_old\" AS ENUM('habit.completed', 'routine.completed', 'focus_session.started', 'focus_session.completed', 'break.started', 'break.completed')",
    );
    await queryRunner.query(
      'ALTER TABLE "webhook_subscriptions" ALTER COLUMN "event_types" TYPE "public"."webhook_event_type_enum_old"[] USING "event_types"::"text"::"public"."webhook_event_type_enum_old"[]',
    );
    await queryRunner.query('DROP TYPE "public"."webhook_subscriptions_event_types_enum"');
    await queryRunner.query('ALTER TYPE "public"."webhook_event_type_enum_old" RENAME TO "webhook_event_type_enum"');
    await queryRunner.query('ALTER TABLE "webhook_subscriptions" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "webhook_subscriptions" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "notes" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "notes" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "note_tags" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "note_tags" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "task_reactions" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "task_reactions" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "comment_attachments" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "comment_attachments" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "task_attachments" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "task_attachments" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "task_comments" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "task_comments" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "task_comment_reactions" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "task_comment_reactions" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('CREATE TYPE "public"."view_action_enum_old" AS ENUM(\'viewed\', \'dismissed\')');
    await queryRunner.query('ALTER TABLE "announcement_views" ALTER COLUMN "action" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "announcement_views" ALTER COLUMN "action" TYPE "public"."view_action_enum_old" USING "action"::"text"::"public"."view_action_enum_old"',
    );
    await queryRunner.query('ALTER TABLE "announcement_views" ALTER COLUMN "action" SET DEFAULT \'viewed\'');
    await queryRunner.query('DROP TYPE "public"."announcement_views_action_enum"');
    await queryRunner.query('ALTER TYPE "public"."view_action_enum_old" RENAME TO "view_action_enum"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"announcement_operating_system_enum_old\" AS ENUM('MacOS', 'Windows', 'Android', 'iOS', 'Web', 'Unknown')",
    );
    await queryRunner.query('ALTER TABLE "announcements" ALTER COLUMN "operating_system" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "announcements" ALTER COLUMN "operating_system" TYPE "public"."announcement_operating_system_enum_old" USING "operating_system"::"text"::"public"."announcement_operating_system_enum_old"',
    );
    await queryRunner.query('ALTER TABLE "announcements" ALTER COLUMN "operating_system" SET DEFAULT \'Unknown\'');
    await queryRunner.query('DROP TYPE "public"."announcements_operating_system_enum"');
    await queryRunner.query(
      'ALTER TYPE "public"."announcement_operating_system_enum_old" RENAME TO "announcement_operating_system_enum"',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"announcement_priority_enum_old\" AS ENUM('low', 'medium', 'high', 'critical')",
    );
    await queryRunner.query('ALTER TABLE "announcements" ALTER COLUMN "priority" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "announcements" ALTER COLUMN "priority" TYPE "public"."announcement_priority_enum_old" USING "priority"::"text"::"public"."announcement_priority_enum_old"',
    );
    await queryRunner.query('ALTER TABLE "announcements" ALTER COLUMN "priority" SET DEFAULT \'medium\'');
    await queryRunner.query('DROP TYPE "public"."announcements_priority_enum"');
    await queryRunner.query(
      'ALTER TYPE "public"."announcement_priority_enum_old" RENAME TO "announcement_priority_enum"',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"announcement_type_enum_old\" AS ENUM('release', 'event', 'survey', 'maintenance')",
    );
    await queryRunner.query(
      'ALTER TABLE "announcements" ALTER COLUMN "type" TYPE "public"."announcement_type_enum_old" USING "type"::"text"::"public"."announcement_type_enum_old"',
    );
    await queryRunner.query('DROP TYPE "public"."announcements_type_enum"');
    await queryRunner.query('ALTER TYPE "public"."announcement_type_enum_old" RENAME TO "announcement_type_enum"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"operating_systems_old\" AS ENUM('MacOS', 'Windows', 'Android', 'iOS', 'Web')",
    );
    await queryRunner.query(
      'ALTER TABLE "app_versions" ALTER COLUMN "operating_system" TYPE "public"."operating_systems_old" USING "operating_system"::"text"::"public"."operating_systems_old"',
    );
    await queryRunner.query('DROP TYPE "public"."app_versions_operating_system_enum"');
    await queryRunner.query('ALTER TYPE "public"."operating_systems_old" RENAME TO "operating_systems"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"async_task_status_enum_old\" AS ENUM('pending', 'processing', 'completed', 'failed')",
    );
    await queryRunner.query('ALTER TABLE "async_tasks" ALTER COLUMN "status" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "async_tasks" ALTER COLUMN "status" TYPE "public"."async_task_status_enum_old" USING "status"::"text"::"public"."async_task_status_enum_old"',
    );
    await queryRunner.query('ALTER TABLE "async_tasks" ALTER COLUMN "status" SET DEFAULT \'pending\'');
    await queryRunner.query('DROP TYPE "public"."async_tasks_status_enum"');
    await queryRunner.query('ALTER TYPE "public"."async_task_status_enum_old" RENAME TO "async_task_status_enum"');
    await queryRunner.query('ALTER TABLE "async_tasks" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "async_tasks" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "flanker_tests" DROP COLUMN "updated_at"');
    await queryRunner.query(
      'ALTER TABLE "flanker_tests" ADD "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
    );
    await queryRunner.query('ALTER TABLE "flanker_tests" DROP COLUMN "created_at"');
    await queryRunner.query(
      'ALTER TABLE "flanker_tests" ADD "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
    );
    await queryRunner.query('ALTER TABLE "health_metrics" DROP COLUMN "updated_at"');
    await queryRunner.query(
      'ALTER TABLE "health_metrics" ADD "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
    );
    await queryRunner.query('ALTER TABLE "health_metrics" DROP COLUMN "created_at"');
    await queryRunner.query(
      'ALTER TABLE "health_metrics" ADD "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
    );
    await queryRunner.query('ALTER TABLE "health_metrics" DROP COLUMN "metric_value"');
    await queryRunner.query('ALTER TABLE "health_metrics" ADD "metric_value" numeric NOT NULL DEFAULT \'0\'');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"metric_type_enum_old\" AS ENUM('hours_of_sleep', 'minutes_of_movement', 'number_of_steps_moved')",
    );
    await queryRunner.query(
      'ALTER TABLE "health_metrics" ALTER COLUMN "metric_type" TYPE "public"."metric_type_enum_old" USING "metric_type"::"text"::"public"."metric_type_enum_old"',
    );
    await queryRunner.query('DROP TYPE "public"."health_metrics_metric_type_enum"');
    await queryRunner.query('ALTER TYPE "public"."metric_type_enum_old" RENAME TO "metric_type_enum"');
    await queryRunner.query('ALTER TABLE "health_metrics" DROP COLUMN "user_id"');
    await queryRunner.query('ALTER TABLE "health_metrics" ADD "user_id" uuid NOT NULL');
    await queryRunner.query('ALTER TABLE "usage_data" DROP COLUMN "updated_at"');
    await queryRunner.query(
      'ALTER TABLE "usage_data" ADD "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
    );
    await queryRunner.query('ALTER TABLE "usage_data" DROP COLUMN "created_at"');
    await queryRunner.query(
      'ALTER TABLE "usage_data" ADD "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
    );
    await queryRunner.query('ALTER TABLE "usage_data" DROP COLUMN "device_id"');
    await queryRunner.query('ALTER TABLE "usage_data" ADD "device_id" character varying(255) NOT NULL');
    await queryRunner.query('ALTER TABLE "usage_data" DROP COLUMN "platform"');
    await queryRunner.query('ALTER TABLE "usage_data" ADD "platform" character varying(255) NOT NULL');
    await queryRunner.query('ALTER TABLE "usage_data" DROP COLUMN "usage_category"');
    await queryRunner.query('ALTER TABLE "usage_data" ADD "usage_category" character varying(255) NOT NULL');
    await queryRunner.query('CREATE TYPE "public"."usage_type_enum_old" AS ENUM(\'app\', \'website\')');
    await queryRunner.query(
      'ALTER TABLE "usage_data" ALTER COLUMN "usage_type" TYPE "public"."usage_type_enum_old" USING "usage_type"::"text"::"public"."usage_type_enum_old"',
    );
    await queryRunner.query('DROP TYPE "public"."usage_data_usage_type_enum"');
    await queryRunner.query('ALTER TYPE "public"."usage_type_enum_old" RENAME TO "usage_type_enum"');
    await queryRunner.query('ALTER TABLE "usage_data" DROP COLUMN "source_name"');
    await queryRunner.query('ALTER TABLE "usage_data" ADD "source_name" character varying(255) NOT NULL');
    await queryRunner.query('ALTER TABLE "usage_data" DROP COLUMN "user_id"');
    await queryRunner.query('ALTER TABLE "usage_data" ADD "user_id" uuid NOT NULL');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"app_activation_status_enum_old\" AS ENUM('data_collection_mode', 'all_interventions_active', 'end_of_study')",
    );
    await queryRunner.query('ALTER TABLE "study_participants" ALTER COLUMN "app_activation_status" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "study_participants" ALTER COLUMN "app_activation_status" TYPE "public"."app_activation_status_enum_old" USING "app_activation_status"::"text"::"public"."app_activation_status_enum_old"',
    );
    await queryRunner.query(
      'ALTER TABLE "study_participants" ALTER COLUMN "app_activation_status" SET DEFAULT \'data_collection_mode\'',
    );
    await queryRunner.query('DROP TYPE "public"."study_participants_app_activation_status_enum"');
    await queryRunner.query(
      'ALTER TYPE "public"."app_activation_status_enum_old" RENAME TO "app_activation_status_enum"',
    );
    await queryRunner.query('ALTER TABLE "study_participants" DROP COLUMN "assigned_group"');
    await queryRunner.query('ALTER TABLE "study_participants" ADD "assigned_group" character varying(255)');
    await queryRunner.query('ALTER TABLE "study_participants" DROP COLUMN "user_id"');
    await queryRunner.query('ALTER TABLE "study_participants" ADD "user_id" uuid');
    await queryRunner.query('ALTER TABLE "study_participants" DROP COLUMN "name"');
    await queryRunner.query('ALTER TABLE "study_participants" ADD "name" character varying(255) NOT NULL');
    await queryRunner.query('ALTER TABLE "study_participants" DROP CONSTRAINT "UQ_917c3db377acba3243fa1265dbf"');
    await queryRunner.query('ALTER TABLE "study_participants" DROP COLUMN "email"');
    await queryRunner.query('ALTER TABLE "study_participants" ADD "email" character varying(255)');
    await queryRunner.query(
      'ALTER TABLE "study_participants" ADD CONSTRAINT "study_participants_email_key" UNIQUE ("email")',
    );
    await queryRunner.query('ALTER TABLE "study_participants" DROP CONSTRAINT "UQ_8d8a7c0a64fd564bc5b66d677a9"');
    await queryRunner.query('ALTER TABLE "study_participants" DROP COLUMN "participant_code"');
    await queryRunner.query('ALTER TABLE "study_participants" ADD "participant_code" character varying(255) NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "study_participants" ADD CONSTRAINT "study_participants_participant_code_key" UNIQUE ("participant_code")',
    );
    await queryRunner.query('ALTER TABLE "study_participants" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP');
    await queryRunner.query('ALTER TABLE "study_participants" ALTER COLUMN "updated_at" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "study_participants" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP');
    await queryRunner.query('ALTER TABLE "study_participants" ALTER COLUMN "created_at" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "habit_library_requests" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "habit_library_requests" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "survey_answer_metadata" DROP CONSTRAINT "UQ_c463d824b378cd9e6bc04d07ae1"');
    await queryRunner.query('ALTER TABLE "survey_answer_metadata" DROP CONSTRAINT "UQ_2d8e6f21eebd0596b371cc93e0e"');
    await queryRunner.query('ALTER TABLE "survey_answer_metadata" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "survey_answer_metadata" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "survey_answer" ALTER COLUMN "completed" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "survey_answer" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "survey_answer" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"answer_types_old\" AS ENUM('CHOICES_NUMBER', 'CHOICES_BOOLEAN', 'TEXT', 'TEXT_AND_RATING')",
    );
    await queryRunner.query(
      'ALTER TABLE "survey" ALTER COLUMN "answer_type" TYPE "public"."answer_types_old" USING "answer_type"::"text"::"public"."answer_types_old"',
    );
    await queryRunner.query('DROP TYPE "public"."survey_answer_type_enum"');
    await queryRunner.query('ALTER TYPE "public"."answer_types_old" RENAME TO "answer_types"');
    await queryRunner.query('ALTER TABLE "survey" ALTER COLUMN "choices" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "survey" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "survey" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "track_event" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "track_event" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "team_join_codes" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "team_join_codes" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "admin_access_requests" ALTER COLUMN "admin_user_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "admin_access_requests" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "admin_access_requests" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query(
      'ALTER TABLE "admin_access_requests" ADD CONSTRAINT "FK_7e4952c93107f80cbfb967c9f30" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query('ALTER TABLE "courses" ALTER COLUMN "platform" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "courses" ALTER COLUMN "platform" DROP NOT NULL');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"course_platforms_old\" AS ENUM('web', 'mac', 'win', 'ios', 'android')",
    );
    await queryRunner.query('ALTER TABLE "courses" ALTER COLUMN "platform" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "courses" ALTER COLUMN "platform" TYPE "public"."course_platforms_old" USING "platform"::"text"::"public"."course_platforms_old"',
    );
    await queryRunner.query('DROP TYPE "public"."courses_platform_enum"');
    await queryRunner.query('ALTER TYPE "public"."course_platforms_old" RENAME TO "course_platforms"');
    await queryRunner.query('ALTER TABLE "courses" ALTER COLUMN "deleted" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "courses" ALTER COLUMN "is_hidden" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "courses" ALTER COLUMN "description" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "courses" ALTER COLUMN "name" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "courses" ALTER COLUMN "author_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "courses" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "courses" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query(
      'ALTER TABLE "courses" ADD CONSTRAINT "FK_cce7a734fa75f9f3051c50d3283" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query('ALTER TABLE "course_enrolments" ALTER COLUMN "course_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "course_enrolments" ALTER COLUMN "user_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "course_enrolments" ALTER COLUMN "finished" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "course_enrolments" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "course_enrolments" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query(
      'ALTER TABLE "course_enrolments" ADD CONSTRAINT "FK_96e267f170e2d4ff4eb70b88101" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "course_enrolments" ADD CONSTRAINT "FK_ce42bd84fedc0c4024ef19954b3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query('ALTER TABLE "lesson-completions" ALTER COLUMN "user_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "lesson-completions" ALTER COLUMN "course_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "lesson-completions" ALTER COLUMN "lesson_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "lesson-completions" DROP COLUMN "status"');
    await queryRunner.query('DROP TYPE "public"."lesson-completions_status_enum"');
    await queryRunner.query('ALTER TABLE "lesson-completions" ADD "status" character varying(255)');
    await queryRunner.query('ALTER TABLE "lesson-completions" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "lesson-completions" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "course_ratings" ALTER COLUMN "review" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "course_ratings" ALTER COLUMN "rating" SET DEFAULT \'0\'');
    await queryRunner.query('ALTER TABLE "course_ratings" ALTER COLUMN "course_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "course_ratings" ALTER COLUMN "user_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "course_ratings" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "course_ratings" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query(
      'ALTER TABLE "course_ratings" ADD CONSTRAINT "FK_32b68ae69d8fb9200a854d6b331" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "course_ratings" ADD CONSTRAINT "FK_01519cb0eb5e5a294938c012ef1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query('ALTER TABLE "lessons" DROP COLUMN "url"');
    await queryRunner.query('ALTER TABLE "lessons" ADD "url" character varying(255)');
    await queryRunner.query('ALTER TABLE "lessons" ALTER COLUMN "content" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "lessons" ALTER COLUMN "title" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "lessons" ALTER COLUMN "course_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "lessons" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "lessons" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query(
      'ALTER TABLE "lessons" ADD CONSTRAINT "FK_3c4e299cf8ed04093935e2e22fe" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query('ALTER TABLE "tracks" ALTER COLUMN "thumbnail_file_name" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "tracks" ALTER COLUMN "duration" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "tracks" ALTER COLUMN "file_name" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "tracks" ALTER COLUMN "description" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "tracks" ALTER COLUMN "artist" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "tracks" ALTER COLUMN "name" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "tracks" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "tracks" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "external_api_tokens" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "external_api_tokens" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "video_metadata" DROP COLUMN "thumbnail_url"');
    await queryRunner.query('ALTER TABLE "video_metadata" ADD "thumbnail_url" character varying(255) DEFAULT NULL');
    await queryRunner.query('ALTER TABLE "video_metadata" DROP COLUMN "duration"');
    await queryRunner.query('ALTER TABLE "video_metadata" ADD "duration" character varying(255)');
    await queryRunner.query('ALTER TABLE "video_metadata" DROP COLUMN "title"');
    await queryRunner.query('ALTER TABLE "video_metadata" ADD "title" character varying(255)');
    await queryRunner.query('ALTER TABLE "video_metadata" DROP COLUMN "video_url"');
    await queryRunner.query('ALTER TABLE "video_metadata" ADD "video_url" character varying(255) NOT NULL');
    await queryRunner.query('ALTER TABLE "video_metadata" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "video_metadata" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "video_metadata" DROP CONSTRAINT "UQ_601cdb0e334e8838bfc0c59ca22"');
    await queryRunner.query('ALTER TABLE "video_metadata" DROP CONSTRAINT "PK_601cdb0e334e8838bfc0c59ca22"');
    await queryRunner.query('ALTER TABLE "video_metadata" DROP COLUMN "id"');
    await queryRunner.query('ALTER TABLE "video_metadata" ADD "id" character varying(255) NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "video_metadata" ADD CONSTRAINT "UQ_601cdb0e334e8838bfc0c59ca22" UNIQUE ("id")',
    );
    await queryRunner.query('ALTER TABLE "video_metadata" ADD CONSTRAINT "video_metadata_pkey" PRIMARY KEY ("id")');
    await queryRunner.query('ALTER TABLE "feedbacks" DROP CONSTRAINT "UQ_4334f6be2d7d841a9d5205a100e"');
    await queryRunner.query('ALTER TABLE "feedbacks" ALTER COLUMN "cancel_subscription_reason" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "feedbacks" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "feedbacks" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "feature_flags" SET DEFAULT \'[]\'');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "email_frequency" DROP NOT NULL');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"email_frequency_enum_old\" AS ENUM('daily', 'weekly', 'monthly', 'unsubscribed')",
    );
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "email_frequency" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "email_frequency" TYPE "public"."email_frequency_enum_old" USING "email_frequency"::"text"::"public"."email_frequency_enum_old"',
    );
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "email_frequency" SET DEFAULT \'weekly\'');
    await queryRunner.query('DROP TYPE "public"."users_email_frequency_enum"');
    await queryRunner.query('ALTER TYPE "public"."email_frequency_enum_old" RENAME TO "email_frequency_enum"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "number_days_completed"');
    await queryRunner.query('ALTER TABLE "users" ADD "number_days_completed" double precision NOT NULL DEFAULT \'0\'');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "num_days_of_stats"');
    await queryRunner.query('ALTER TABLE "users" ADD "num_days_of_stats" double precision NOT NULL DEFAULT \'0\'');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "micro_breaks_streak" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "focus_modes_streak" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "evening_routines_streak" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "morning_routines_streak" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "last_completed_focus_mode_at" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "last_time_stats_updated" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "last_time_stats_updated" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "onboarding_progress" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "metadata" DROP NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "cutoff_time_for_non_high_priority_activities" DROP NOT NULL',
    );
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "has_edited_settings" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "timezone"');
    await queryRunner.query('ALTER TABLE "users" ADD "timezone" character varying(255) DEFAULT \'UTC\'');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "current_sequence_skipped_activities" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "signed_up_via_focus_mode" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "signed_up_via_habit_pack" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "user_type" DROP NOT NULL');
    await queryRunner.query('CREATE TYPE "public"."user_types_old" AS ENUM(\'STANDARD\', \'ADMIN\')');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "user_type" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "user_type" TYPE "public"."user_types_old" USING "user_type"::"text"::"public"."user_types_old"',
    );
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "user_type" SET DEFAULT \'STANDARD\'');
    await queryRunner.query('DROP TYPE "public"."users_user_type_enum"');
    await queryRunner.query('ALTER TYPE "public"."user_types_old" RENAME TO "user_types"');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "local_device_settings" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "current_sequence_started_at" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "last_completed_sequence_started_at" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "last_completed_sequence_at" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "current_completing_sequence_log_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "current_activity_assigned_at" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "UQ_16bcf73d1900d2a3061edbeef55"');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "current_completing_focus_block_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "current_focus_mode_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "is_office_mode_activated" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "password_for_settings" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "current_focus_mode_finish_time" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "break_after_minutes"');
    await queryRunner.query('ALTER TABLE "users" ADD "break_after_minutes" integer');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "shutdown_time" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "startup_time" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_24f35ae7290dee881590641795d" FOREIGN KEY ("signed_up_via_habit_pack") REFERENCES "habit_packs"("id") ON DELETE NO ACTION ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_571efd35d4486a3d8d876bd9f78" FOREIGN KEY ("current_completing_sequence_log_id") REFERENCES "completed_activity_sequences"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_975fdeac7998e0b535c84097a65" FOREIGN KEY ("current_focus_mode_id") REFERENCES "focus_modes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "accountability_buddy" ALTER COLUMN "invitation_sent_at" SET DEFAULT CURRENT_TIMESTAMP',
    );
    await queryRunner.query('ALTER TABLE "accountability_buddy" DROP COLUMN "invitation_status"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"invitation_status_enum\" AS ENUM('pending', 'accepted', 'rejected', 'expired')",
    );
    await queryRunner.query(
      'ALTER TABLE "accountability_buddy" ADD "invitation_status" "public"."invitation_status_enum" NOT NULL DEFAULT \'pending\'',
    );
    await queryRunner.query('ALTER TABLE "accountability_buddy" ALTER COLUMN "buddy_email" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "accountability_buddy" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "accountability_buddy" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "unlock_requests" DROP COLUMN "status"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"unlock_request_status_enum\" AS ENUM('pending', 'approved', 'rejected', 'expired')",
    );
    await queryRunner.query(
      'ALTER TABLE "unlock_requests" ADD "status" "public"."unlock_request_status_enum" NOT NULL DEFAULT \'pending\'',
    );
    await queryRunner.query('ALTER TABLE "unlock_requests" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "unlock_requests" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "calendars" ALTER COLUMN "summary" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "calendars" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "calendars" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "calendar_excluded_keywords" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "calendar_excluded_keywords" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "platform_integrations" ALTER COLUMN "only_assigned" SET DEFAULT true');
    await queryRunner.query('ALTER TABLE "platform_integrations" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "platform_integrations" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "user_feedback" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "user_feedback" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"impact_category_enum_old\" AS ENUM('hours_of_sleep', 'energy_level_upon_awakening', 'mood', 'perception_of_productivity', 'minutes_spent_on_distracting_websites', 'minutes_spent_postponing_app_blocks', 'minutes_spent_postponing_habits')",
    );
    await queryRunner.query(
      'ALTER TABLE "impact_events" ALTER COLUMN "impact_category" TYPE "public"."impact_category_enum_old" USING "impact_category"::"text"::"public"."impact_category_enum_old"',
    );
    await queryRunner.query('DROP TYPE "public"."impact_events_impact_category_enum"');
    await queryRunner.query('ALTER TYPE "public"."impact_category_enum_old" RENAME TO "impact_category_enum"');
    await queryRunner.query('ALTER TABLE "impact_events" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "impact_events" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "saved_websites_for_relax_block" DROP COLUMN "note"');
    await queryRunner.query('ALTER TABLE "saved_websites_for_relax_block" ADD "note" character varying(255)');
    await queryRunner.query('ALTER TABLE "saved_websites_for_relax_block" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "saved_websites_for_relax_block" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "user_consent" ALTER COLUMN "withdrawal_date" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "user_consent" ALTER COLUMN "consent_status" SET DEFAULT false');
    await queryRunner.query('ALTER TABLE "user_consent" ALTER COLUMN "consent_status" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "user_consent" DROP COLUMN "consent_type"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"consent_types\" AS ENUM('event_tracking', 'email_marketing', 'privacy_policy', 'terms_of_service', 'data_processing')",
    );
    await queryRunner.query('ALTER TABLE "user_consent" ADD "consent_type" "public"."consent_types"');
    await queryRunner.query('ALTER TABLE "user_consent" ALTER COLUMN "user_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "user_consent" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "user_consent" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query(
      'ALTER TABLE "user_consent" ADD CONSTRAINT "FK_4174e45dd98eb587c2348b8ca1d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query('ALTER TABLE "notifications" DROP COLUMN "notification_type"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"notification_type_enum\" AS ENUM('calendar_event', 'accountability_buddy_invitation', 'accountability_buddy_invitation_accepted', 'unlock_request_received', 'unlock_request_approved', 'unlock_request_rejected')",
    );
    await queryRunner.query(
      'ALTER TABLE "notifications" ADD "notification_type" "public"."notification_type_enum" DEFAULT \'calendar_event\'',
    );
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "received" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "dismiss_reason" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "is_dismissed" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "event_ends" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "event_begins" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "description" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "summary" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" DROP CONSTRAINT "UQ_def4fd3a4bd79c4331c2b84a2e1"');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "external_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" DROP CONSTRAINT "UQ_82e9861292085ee6d57ba5ecd83"');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "calendar_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" DROP CONSTRAINT "UQ_cd4e54cfac92fec7384fc955179"');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "platform_account" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" DROP CONSTRAINT "UQ_65bd4afcb9043001c3f90facd78"');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "platform" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "user_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "notifications" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query(
      'ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query('ALTER TABLE "team_to_admin" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "team_to_admin" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query(
      'ALTER TABLE "team_to_member" ALTER COLUMN "invitation_sent_at" SET DEFAULT CURRENT_TIMESTAMP',
    );
    await queryRunner.query('ALTER TABLE "team_to_member" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "team_to_member" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "focus_modes" DROP COLUMN "deleted_at"');
    await queryRunner.query('ALTER TABLE "focus_modes" ADD "deleted_at" TIMESTAMP WITH TIME ZONE');
    await queryRunner.query('ALTER TABLE "focus_modes" ALTER COLUMN "focus_mode_template_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_modes" ALTER COLUMN "metadata" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_modes" ALTER COLUMN "allowed_urls" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_modes" ALTER COLUMN "allowed_apps" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_modes" ALTER COLUMN "name" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_modes" ALTER COLUMN "user_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_modes" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "focus_modes" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query(
      'ALTER TABLE "focus_modes" ADD CONSTRAINT "FK_8c944861e1793cb9a4da0fb04c8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"block_level_enum_old\" AS ENUM('gentle', 'strict', 'super-strict')",
    );
    await queryRunner.query('ALTER TABLE "blocking_schedules" ALTER COLUMN "block_level" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "blocking_schedules" ALTER COLUMN "block_level" TYPE "public"."block_level_enum_old" USING "block_level"::"text"::"public"."block_level_enum_old"',
    );
    await queryRunner.query('ALTER TABLE "blocking_schedules" ALTER COLUMN "block_level" SET DEFAULT \'strict\'');
    await queryRunner.query('DROP TYPE "public"."blocking_schedules_block_level_enum"');
    await queryRunner.query('ALTER TYPE "public"."block_level_enum_old" RENAME TO "block_level_enum"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"pause_friction_enum_old\" AS ENUM('none', 'timer', '100_random_chars', 'password')",
    );
    await queryRunner.query('ALTER TABLE "blocking_schedules" ALTER COLUMN "pause_friction" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "blocking_schedules" ALTER COLUMN "pause_friction" TYPE "public"."pause_friction_enum_old" USING "pause_friction"::"text"::"public"."pause_friction_enum_old"',
    );
    await queryRunner.query('ALTER TABLE "blocking_schedules" ALTER COLUMN "pause_friction" SET DEFAULT \'none\'');
    await queryRunner.query('DROP TYPE "public"."blocking_schedules_pause_friction_enum"');
    await queryRunner.query('ALTER TYPE "public"."pause_friction_enum_old" RENAME TO "pause_friction_enum"');
    await queryRunner.query('ALTER TABLE "blocking_schedules" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "blocking_schedules" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" DROP COLUMN "deleted_at"');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ADD "deleted_at" TIMESTAMP WITH TIME ZONE');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "language" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "featured_for_onboarding" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "is_featured" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" DROP COLUMN "marketplace_request"');
    await queryRunner.query('CREATE TYPE "public"."marketplace_request" AS ENUM(\'requested\', \'unrequested\')');
    await queryRunner.query(
      'ALTER TABLE "focus_mode_templates" ADD "marketplace_request" "public"."marketplace_request" DEFAULT \'unrequested\'',
    );
    await queryRunner.query(
      'ALTER TABLE "focus_mode_templates" ALTER COLUMN "marketplace_approval_status" DROP NOT NULL',
    );
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "welcome_video_url" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "welcome_message" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "description_video_url" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "description" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "allowed_urls" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "allowed_apps" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "name" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "author_name" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "focus_mode_templates" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "focus_mode_tags" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "focus_mode_tags" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" ALTER COLUMN "metadata" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" ALTER COLUMN "distractions" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" ALTER COLUMN "achievements" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" ALTER COLUMN "intention" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" ALTER COLUMN "finish_time" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" ALTER COLUMN "start_time" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" ALTER COLUMN "focus_mode_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" ALTER COLUMN "user_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "completed_focus_blocks" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query(
      'ALTER TABLE "completed_focus_blocks" ADD CONSTRAINT "FK_1b5cd35b5bdda454fd7ae27b2a9" FOREIGN KEY ("focus_mode_id") REFERENCES "focus_modes"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_focus_blocks" ADD CONSTRAINT "FK_e07f494fb6be4bd758fd6bcb8d6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query('ALTER TABLE "to_do" DROP COLUMN "icon"');
    await queryRunner.query('ALTER TABLE "to_do" ADD "icon" character varying(10)');
    await queryRunner.query('ALTER TABLE "to_do" DROP COLUMN "duration"');
    await queryRunner.query('ALTER TABLE "to_do" ADD "duration" numeric DEFAULT \'0\'');
    await queryRunner.query('ALTER TABLE "to_do" DROP COLUMN "status"');
    await queryRunner.query('ALTER TABLE "to_do" ADD "status" character varying(255)');
    await queryRunner.query('ALTER TABLE "to_do" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "to_do" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query(
      'ALTER TABLE "projects" ALTER COLUMN "custom_statuses" SET DEFAULT \'[{"id": "default-todo", "color": "#6B7280", "label": "To Do", "order": 0, "should_complete_task": false}, {"id": "default-in-progress", "color": "#3B82F6", "label": "In Progress", "order": 1, "should_complete_task": false}, {"id": "default-done", "color": "#10B981", "label": "Done", "order": 2, "should_complete_task": true}]\'',
    );
    await queryRunner.query('ALTER TABLE "projects" ALTER COLUMN "custom_statuses" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "projects" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "projects" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query(
      'ALTER TABLE "project_members" ALTER COLUMN "invitation_sent_at" SET DEFAULT CURRENT_TIMESTAMP',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"project_member_invitation_status_enum_old\" AS ENUM('pending', 'accepted', 'declined', 'failed')",
    );
    await queryRunner.query('ALTER TABLE "project_members" ALTER COLUMN "invitation_status" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "project_members" ALTER COLUMN "invitation_status" TYPE "public"."project_member_invitation_status_enum_old" USING "invitation_status"::"text"::"public"."project_member_invitation_status_enum_old"',
    );
    await queryRunner.query('ALTER TABLE "project_members" ALTER COLUMN "invitation_status" SET DEFAULT \'pending\'');
    await queryRunner.query('DROP TYPE "public"."project_members_invitation_status_enum"');
    await queryRunner.query(
      'ALTER TYPE "public"."project_member_invitation_status_enum_old" RENAME TO "project_member_invitation_status_enum"',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"project_member_role_enum_old\" AS ENUM('owner', 'admin', 'member')",
    );
    await queryRunner.query('ALTER TABLE "project_members" ALTER COLUMN "role" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "project_members" ALTER COLUMN "role" TYPE "public"."project_member_role_enum_old" USING "role"::"text"::"public"."project_member_role_enum_old"',
    );
    await queryRunner.query('ALTER TABLE "project_members" ALTER COLUMN "role" SET DEFAULT \'member\'');
    await queryRunner.query('DROP TYPE "public"."project_members_role_enum"');
    await queryRunner.query('ALTER TYPE "public"."project_member_role_enum_old" RENAME TO "project_member_role_enum"');
    await queryRunner.query('ALTER TABLE "project_members" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "project_members" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "synced_projects" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "synced_projects" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "tasks_time_logs" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "tasks_time_logs" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query(
      'ALTER TABLE "installed_focus_mode_templates" ALTER COLUMN "installation_status" DROP NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_focus_mode_templates" ALTER COLUMN "focus_mode_template_id" DROP NOT NULL',
    );
    await queryRunner.query('ALTER TABLE "installed_focus_mode_templates" ALTER COLUMN "user_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "installed_focus_mode_templates" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "installed_focus_mode_templates" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query(
      'ALTER TABLE "installed_focus_mode_templates" ADD CONSTRAINT "FK_811874df684c60b8720047d86fb" FOREIGN KEY ("focus_mode_template_id") REFERENCES "focus_mode_templates"("id") ON DELETE NO ACTION ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_focus_mode_templates" ADD CONSTRAINT "FK_9794613b59be7595599b692c48e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query('ALTER TABLE "devices" ALTER COLUMN "metadata" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "devices" ALTER COLUMN "is_leader" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "devices" ALTER COLUMN "is_leader" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "devices" ALTER COLUMN "operating_system" DROP NOT NULL');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"operating_systems_old\" AS ENUM('MacOS', 'Windows', 'Android', 'iOS', 'Web')",
    );
    await queryRunner.query(
      'ALTER TABLE "devices" ALTER COLUMN "operating_system" TYPE "public"."operating_systems_old" USING "operating_system"::"text"::"public"."operating_systems_old"',
    );
    await queryRunner.query('DROP TYPE "public"."devices_operating_system_enum"');
    await queryRunner.query('ALTER TYPE "public"."operating_systems_old" RENAME TO "operating_systems"');
    await queryRunner.query('ALTER TABLE "devices" ALTER COLUMN "user_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "devices" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "devices" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query(
      'ALTER TABLE "devices" ADD CONSTRAINT "FK_5e9bee993b4ce35c3606cda194c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query('ALTER TABLE "activity_sequences" ALTER COLUMN "custom_routine_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "activity_sequences" ALTER COLUMN "total_duration_seconds" SET DEFAULT \'0\'');
    await queryRunner.query('ALTER TABLE "activity_sequences" ALTER COLUMN "activity_ids" DROP NOT NULL');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"activity_types_old\" AS ENUM('morning', 'evening', 'breaking', 'standalone', 'library')",
    );
    await queryRunner.query(
      'ALTER TABLE "activity_sequences" ALTER COLUMN "type" TYPE "public"."activity_types_old" USING "type"::"text"::"public"."activity_types_old"',
    );
    await queryRunner.query('DROP TYPE "public"."activity_sequences_type_enum"');
    await queryRunner.query('ALTER TYPE "public"."activity_types_old" RENAME TO "activity_types"');
    await queryRunner.query('ALTER TABLE "activity_sequences" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "activity_sequences" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "custom_routines" ALTER COLUMN "end_time" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "custom_routines" ALTER COLUMN "start_time" DROP NOT NULL');
    await queryRunner.query(
      'CREATE TYPE "public"."custom_routine_trigger_enum_old" AS ENUM(\'ON_DEMAND\', \'ON_SCHEDULE\')',
    );
    await queryRunner.query('ALTER TABLE "custom_routines" ALTER COLUMN "trigger" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "custom_routines" ALTER COLUMN "trigger" TYPE "public"."custom_routine_trigger_enum_old" USING "trigger"::"text"::"public"."custom_routine_trigger_enum_old"',
    );
    await queryRunner.query('ALTER TABLE "custom_routines" ALTER COLUMN "trigger" SET DEFAULT \'ON_DEMAND\'');
    await queryRunner.query('DROP TYPE "public"."custom_routines_trigger_enum"');
    await queryRunner.query(
      'ALTER TYPE "public"."custom_routine_trigger_enum_old" RENAME TO "custom_routine_trigger_enum"',
    );
    await queryRunner.query('ALTER TABLE "custom_routines" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "custom_routines" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "cutoff_time_for_doing_activity" DROP NOT NULL');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"impact_category_enum_old\" AS ENUM('hours_of_sleep', 'energy_level_upon_awakening', 'mood', 'perception_of_productivity', 'minutes_spent_on_distracting_websites', 'minutes_spent_postponing_app_blocks', 'minutes_spent_postponing_habits')",
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ALTER COLUMN "impact_category" TYPE "public"."impact_category_enum_old" USING "impact_category"::"text"::"public"."impact_category_enum_old"',
    );
    await queryRunner.query('DROP TYPE "public"."activities_impact_category_enum"');
    await queryRunner.query('ALTER TYPE "public"."impact_category_enum_old" RENAME TO "impact_category_enum"');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "days_of_week" SET DEFAULT \'["ALL"]\'');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "run_micro_breaks" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "is_default" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "activity_data" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "duration_seconds" SET DEFAULT \'0\'');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "log_quantity" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "log_summary_type" DROP NOT NULL');
    await queryRunner.query('CREATE TYPE "public"."log_summary_types_old" AS ENUM(\'SUM\', \'AVG\')');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "log_summary_type" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "activities" ALTER COLUMN "log_summary_type" TYPE "public"."log_summary_types_old" USING "log_summary_type"::"text"::"public"."log_summary_types_old"',
    );
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "log_summary_type" SET DEFAULT \'SUM\'');
    await queryRunner.query('DROP TYPE "public"."activities_log_summary_type_enum"');
    await queryRunner.query('ALTER TYPE "public"."log_summary_types_old" RENAME TO "log_summary_types"');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "activity_type" DROP NOT NULL');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"activity_types_old\" AS ENUM('morning', 'evening', 'breaking', 'standalone', 'library')",
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ALTER COLUMN "activity_type" TYPE "public"."activity_types_old" USING "activity_type"::"text"::"public"."activity_types_old"',
    );
    await queryRunner.query('DROP TYPE "public"."activities_activity_type_enum"');
    await queryRunner.query('ALTER TYPE "public"."activity_types_old" RENAME TO "activity_types"');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "activity_sequence_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "has_choices" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "activity_template_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "parent_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "user_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "activities" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query(
      'ALTER TABLE "activities" ADD CONSTRAINT "FK_55fe1e1514a9f21cf7e5b46d8b0" FOREIGN KEY ("activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ADD CONSTRAINT "FK_62b1bed769a3fa8d7f2bacf948c" FOREIGN KEY ("activity_template_id") REFERENCES "activity_template"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ADD CONSTRAINT "FK_797b2408833193b3a5fd0216f42" FOREIGN KEY ("parent_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ADD CONSTRAINT "FK_b82f1d8368dd5305ae7e7e664c2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query('ALTER TABLE "geofences" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "geofences" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "completed_activities" ALTER COLUMN "activity_note" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_activities" ALTER COLUMN "completed_sequence_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_activities" ALTER COLUMN "duration_logged" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_activities" ALTER COLUMN "quantity_logged" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_activities" ALTER COLUMN "finish_time" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_activities" ALTER COLUMN "start_time" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_activities" ALTER COLUMN "activity_sequence_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_activities" ALTER COLUMN "user_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_activities" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "completed_activities" ALTER COLUMN "created_at" SET DEFAULT now()');
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
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "FK_8e655b7aaf5014e0cd9d7bc472c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query('ALTER TABLE "log_quantity_answers" ALTER COLUMN "date_logged" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "log_quantity_answers" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "log_quantity_answers" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "log_quantity_questions" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "log_quantity_questions" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "activity_template" DROP COLUMN "deleted_at"');
    await queryRunner.query('ALTER TABLE "activity_template" ADD "deleted_at" TIMESTAMP WITH TIME ZONE');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"impact_category_enum_old\" AS ENUM('hours_of_sleep', 'energy_level_upon_awakening', 'mood', 'perception_of_productivity', 'minutes_spent_on_distracting_websites', 'minutes_spent_postponing_app_blocks', 'minutes_spent_postponing_habits')",
    );
    await queryRunner.query(
      'ALTER TABLE "activity_template" ALTER COLUMN "impact_category" TYPE "public"."impact_category_enum_old" USING "impact_category"::"text"::"public"."impact_category_enum_old"',
    );
    await queryRunner.query('DROP TYPE "public"."activity_template_impact_category_enum"');
    await queryRunner.query('ALTER TYPE "public"."impact_category_enum_old" RENAME TO "impact_category_enum"');
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "parent_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "duration_seconds" SET DEFAULT \'0\'');
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "has_choices" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "has_choices" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "activity_data" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "log_quantity" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "log_summary_type" DROP NOT NULL');
    await queryRunner.query('CREATE TYPE "public"."log_summary_types_old" AS ENUM(\'SUM\', \'AVG\')');
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "log_summary_type" DROP DEFAULT');
    await queryRunner.query(
      'ALTER TABLE "activity_template" ALTER COLUMN "log_summary_type" TYPE "public"."log_summary_types_old" USING "log_summary_type"::"text"::"public"."log_summary_types_old"',
    );
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "log_summary_type" SET DEFAULT \'SUM\'');
    await queryRunner.query('DROP TYPE "public"."activity_template_log_summary_type_enum"');
    await queryRunner.query('ALTER TYPE "public"."log_summary_types_old" RENAME TO "log_summary_types"');
    await queryRunner.query('ALTER TABLE "activity_template" DROP COLUMN "activity_type"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"activity_types\" AS ENUM('morning', 'evening', 'breaking', 'standalone', 'library')",
    );
    await queryRunner.query('ALTER TABLE "activity_template" ADD "activity_type" "public"."activity_types"');
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "user_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "pack_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "activity_template" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query(
      'ALTER TABLE "activity_template" ADD CONSTRAINT "FK_b4153d8eb28b96ba7e7456c9dec" FOREIGN KEY ("parent_id") REFERENCES "activity_template"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_template" ADD CONSTRAINT "FK_812680d65acf98b56f5ee4d0513" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_template" ADD CONSTRAINT "FK_164ed73d380a84065291f14b587" FOREIGN KEY ("pack_id") REFERENCES "habit_packs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query('ALTER TABLE "activity_template_embedding" DROP COLUMN "embedding"');
    await queryRunner.query('ALTER TABLE "activity_template_embedding" ADD "embedding" vector(1536) NOT NULL');
    await queryRunner.query('ALTER TABLE "activity_template_embedding" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "activity_template_embedding" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "activity_template_tag" ALTER COLUMN "tags" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "activity_template_tag" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "activity_template_tag" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "tutorials" DROP CONSTRAINT "UQ_9f026abf577dbec095417ceed1a"');
    await queryRunner.query('ALTER TABLE "tutorials" DROP COLUMN "user_id"');
    await queryRunner.query('ALTER TABLE "tutorials" ADD "user_id" uuid');
    await queryRunner.query('ALTER TABLE "tutorials" DROP CONSTRAINT "UQ_fadb0c4b276a354163f33b59d7e"');
    await queryRunner.query('ALTER TABLE "tutorials" ALTER COLUMN "activity_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "tutorials" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "tutorials" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "habit_packs" DROP COLUMN "deleted_at"');
    await queryRunner.query('ALTER TABLE "habit_packs" ADD "deleted_at" TIMESTAMP WITH TIME ZONE');
    await queryRunner.query('ALTER TABLE "habit_packs" ALTER COLUMN "breaks_only" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "habit_packs" ALTER COLUMN "duration" SET DEFAULT \'0\'');
    await queryRunner.query('ALTER TABLE "habit_packs" ALTER COLUMN "evening_routine_duration_seconds" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "habit_packs" ALTER COLUMN "morning_routine_duration_seconds" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "habit_packs" DROP COLUMN "language"');
    await queryRunner.query('ALTER TABLE "habit_packs" ADD "language" character varying(255)');
    await queryRunner.query('ALTER TABLE "habit_packs" ALTER COLUMN "featured_for_onboarding" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "habit_packs" ALTER COLUMN "is_featured" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "habit_packs" DROP COLUMN "marketplace_request"');
    await queryRunner.query('CREATE TYPE "public"."marketplace_request" AS ENUM(\'requested\', \'unrequested\')');
    await queryRunner.query('ALTER TABLE "habit_packs" ADD "marketplace_request" "public"."marketplace_request"');
    await queryRunner.query('ALTER TABLE "habit_packs" ALTER COLUMN "marketplace_approval_status" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "habit_packs" DROP COLUMN "welcome_video_url"');
    await queryRunner.query('ALTER TABLE "habit_packs" ADD "welcome_video_url" character varying(255)');
    await queryRunner.query('ALTER TABLE "habit_packs" DROP COLUMN "welcome_message"');
    await queryRunner.query('ALTER TABLE "habit_packs" ADD "welcome_message" character varying(2500)');
    await queryRunner.query('ALTER TABLE "habit_packs" DROP COLUMN "description_video_url"');
    await queryRunner.query('ALTER TABLE "habit_packs" ADD "description_video_url" character varying(255)');
    await queryRunner.query('ALTER TABLE "habit_packs" DROP COLUMN "description"');
    await queryRunner.query('ALTER TABLE "habit_packs" ADD "description" character varying(2500)');
    await queryRunner.query('ALTER TABLE "habit_packs" DROP COLUMN "creator_name"');
    await queryRunner.query('ALTER TABLE "habit_packs" ADD "creator_name" character varying(255)');
    await queryRunner.query('ALTER TABLE "habit_packs" DROP COLUMN "pack_name"');
    await queryRunner.query('ALTER TABLE "habit_packs" ADD "pack_name" character varying(255)');
    await queryRunner.query('ALTER TABLE "habit_packs" DROP COLUMN "pack_type"');
    await queryRunner.query('CREATE TYPE "public"."habit_pack_types" AS ENUM(\'routine\', \'standalone\')');
    await queryRunner.query('ALTER TABLE "habit_packs" ADD "pack_type" "public"."habit_pack_types"');
    await queryRunner.query('ALTER TABLE "habit_packs" ALTER COLUMN "user_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "habit_packs" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "habit_packs" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query(
      'ALTER TABLE "habit_packs" ADD CONSTRAINT "FK_c78642e7a487983c6eef72ab977" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query('ALTER TABLE "installed_packs" ALTER COLUMN "activity_sequence_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "installed_packs" ALTER COLUMN "installation_status" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "installed_packs" ALTER COLUMN "pack_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "installed_packs" ALTER COLUMN "user_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "installed_packs" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "installed_packs" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query(
      'ALTER TABLE "installed_packs" ADD CONSTRAINT "FK_9c3607b832d303ccf87bcb9f00b" FOREIGN KEY ("pack_id") REFERENCES "habit_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "installed_packs" ADD CONSTRAINT "FK_634d333e9adb5d90a96aeffdd46" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" ALTER COLUMN "duration_percent_deviation" DROP NOT NULL',
    );
    await queryRunner.query('ALTER TABLE "completed_activity_sequences" ALTER COLUMN "is_completed" SET DEFAULT true');
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" ALTER COLUMN "plan_duration_minutes" DROP NOT NULL',
    );
    await queryRunner.query('ALTER TABLE "completed_activity_sequences" ALTER COLUMN "duration_minutes" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_activity_sequences" ALTER COLUMN "finish_time" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_activity_sequences" ALTER COLUMN "start_time" DROP NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" ALTER COLUMN "activity_sequence_id" DROP NOT NULL',
    );
    await queryRunner.query('ALTER TABLE "completed_activity_sequences" ALTER COLUMN "user_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "completed_activity_sequences" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "completed_activity_sequences" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" ADD CONSTRAINT "FK_cb520c9fab7e274b4bd190f3016" FOREIGN KEY ("activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activity_sequences" ADD CONSTRAINT "FK_0672e8970f2bdebee79f4268254" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query('ALTER TABLE "daily_stats" DROP CONSTRAINT "UQ_f2fc1124527683faa88f1bde15f"');
    await queryRunner.query('ALTER TABLE "daily_stats" DROP COLUMN "break_sequence_log_id"');
    await queryRunner.query('ALTER TABLE "daily_stats" ADD "break_sequence_log_id" numeric DEFAULT \'0\'');
    await queryRunner.query('ALTER TABLE "daily_stats" ALTER COLUMN "should_recalculate" SET DEFAULT false');
    await queryRunner.query('ALTER TABLE "daily_stats" ALTER COLUMN "should_recalculate" DROP NOT NULL');
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ALTER COLUMN "micro_breaks_routine_completion_percentage" DROP NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ALTER COLUMN "evening_routine_completion_percentage" DROP NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ALTER COLUMN "morning_routine_completion_percentage" DROP NOT NULL',
    );
    await queryRunner.query('ALTER TABLE "daily_stats" ALTER COLUMN "focus_modes_completed" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "daily_stats" ALTER COLUMN "date_completed" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "daily_stats" ALTER COLUMN "user_id" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "daily_stats" ALTER COLUMN "updated_at" SET DEFAULT now()');
    await queryRunner.query('ALTER TABLE "daily_stats" ALTER COLUMN "created_at" SET DEFAULT now()');
    await queryRunner.query(
      'ALTER TABLE "daily_stats" ADD CONSTRAINT "FK_7c09b7133924634d328ea96398e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD "micro_percent_completed" double precision NOT NULL DEFAULT \'0\'',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD "evening_percent_completed" double precision NOT NULL DEFAULT \'0\'',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD "morning_percent_completed" double precision NOT NULL DEFAULT \'0\'',
    );
    await queryRunner.query('ALTER TABLE "users" ADD "member_of_team_id" uuid');
    await queryRunner.query('ALTER TABLE "projects" ADD "external_project_id" character varying(255)');
    await queryRunner.query('ALTER TABLE "projects" ADD "external_project_metadata" jsonb');
    await queryRunner.query(
      'ALTER TABLE "task_comment_reactions" ADD CONSTRAINT "UQ_task_comment_reactions_comment_user_emoji" UNIQUE ("comment_id", "user_id", "emoji")',
    );
    await queryRunner.query(
      'ALTER TABLE "app_versions" ADD CONSTRAINT "UQ_app_versions_os_semver" UNIQUE ("operating_system", "semver_string")',
    );
    await queryRunner.query(
      'ALTER TABLE "usage_data" ADD CONSTRAINT "unique_usage_data" UNIQUE ("user_id", "source_name", "usage_type", "usage_start_date", "usage_end_date")',
    );
    await queryRunner.query(
      'ALTER TABLE "course_enrolments" ADD CONSTRAINT "UQ_course_enrolments_user_id_course_id" UNIQUE ("course_id", "user_id")',
    );
    await queryRunner.query(
      'ALTER TABLE "accountability_buddy" ADD CONSTRAINT "UQ_accountability_buddy_user_buddy_email" UNIQUE ("user_id", "buddy_email")',
    );
    await queryRunner.query(
      'ALTER TABLE "project_members" ADD CONSTRAINT "UQ_project_members_project_email" UNIQUE ("project_id", "email")',
    );
    await queryRunner.query(
      'ALTER TABLE "project_members" ADD CONSTRAINT "UQ_project_members_project_user" UNIQUE ("project_id", "user_id")',
    );
    await queryRunner.query('CREATE INDEX "IDX_notes_todos_todo_id" ON "notes_todos" ("todo_id") ');
    await queryRunner.query('CREATE INDEX "IDX_notes_todos_note_id" ON "notes_todos" ("note_id") ');
    await queryRunner.query('CREATE INDEX "IDX_notes_tags_tag_id" ON "notes_tags" ("tag_id") ');
    await queryRunner.query('CREATE INDEX "IDX_notes_tags_note_id" ON "notes_tags" ("note_id") ');
    await queryRunner.query('CREATE INDEX "IDX_webhook_subscriptions_user_id" ON "webhook_subscriptions" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_notes_completed_activity_id" ON "notes" ("completed_activity_id") ');
    await queryRunner.query('CREATE INDEX "IDX_notes_user_id" ON "notes" ("user_id") ');
    await queryRunner.query('CREATE UNIQUE INDEX "UQ_note_tags_user_id_text" ON "note_tags" ("user_id", "text") ');
    await queryRunner.query('CREATE INDEX "IDX_note_tags_user_id" ON "note_tags" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_task_reactions_user_id" ON "task_reactions" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_task_reactions_task_id" ON "task_reactions" ("task_id") ');
    await queryRunner.query('CREATE INDEX "IDX_comment_attachments_user_id" ON "comment_attachments" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_comment_attachments_comment_id" ON "comment_attachments" ("comment_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_task_attachments_user_id" ON "task_attachments" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_task_attachments_task_id" ON "task_attachments" ("task_id") ');
    await queryRunner.query('CREATE INDEX "IDX_task_comments_user_id" ON "task_comments" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_task_comments_task_id" ON "task_comments" ("task_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_task_comment_reactions_user_id" ON "task_comment_reactions" ("user_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_task_comment_reactions_comment_id" ON "task_comment_reactions" ("comment_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_announcement_views_user_id" ON "announcement_views" ("user_id") ');
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_announcement_views_user_announcement" ON "announcement_views" ("user_id", "announcement_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_announcements_operating_system" ON "announcements" ("operating_system") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_announcements_expiry_date" ON "announcements" ("expiry_date") ');
    await queryRunner.query('CREATE INDEX "IDX_announcements_priority" ON "announcements" ("priority") ');
    await queryRunner.query('CREATE INDEX "IDX_announcements_type" ON "announcements" ("type") ');
    await queryRunner.query('CREATE INDEX "IDX_app_versions_is_supported" ON "app_versions" ("is_supported") ');
    await queryRunner.query('CREATE INDEX "IDX_app_versions_operating_system" ON "app_versions" ("operating_system") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_async_tasks_dedup_pending_lookup" ON "async_tasks" ("created_at", "updated_at") WHERE (status = \'pending\'::async_task_status_enum)',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_async_tasks_dedup_processing_lookup" ON "async_tasks" ("created_at") WHERE (status = \'processing\'::async_task_status_enum)',
    );
    await queryRunner.query('CREATE INDEX "IDX_async_tasks_created_at" ON "async_tasks" ("created_at") ');
    await queryRunner.query('CREATE INDEX "IDX_async_tasks_status" ON "async_tasks" ("status") ');
    await queryRunner.query(
      'CREATE INDEX "idx_flanker_tests_study_participant_id" ON "flanker_tests" ("study_participant_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_health_metrics_day_of_tracking" ON "health_metrics" ("day_of_tracking") ',
    );
    await queryRunner.query('CREATE INDEX "idx_health_metrics_metric_type" ON "health_metrics" ("metric_type") ');
    await queryRunner.query('CREATE INDEX "idx_health_metrics_user_id" ON "health_metrics" ("user_id") ');
    await queryRunner.query('CREATE INDEX "idx_usage_data_updated_at" ON "usage_data" ("updated_at") ');
    await queryRunner.query(
      'CREATE INDEX "idx_usage_data_composite" ON "usage_data" ("user_id", "source_name", "usage_type", "usage_start_date", "usage_end_date") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_usage_data_date_range" ON "usage_data" ("usage_start_date", "usage_end_date") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_usage_data_user_id_platform_day" ON "usage_data" ("user_id", "usage_start_date", "usage_end_date", "platform") ',
    );
    await queryRunner.query('CREATE INDEX "idx_usage_data_user_id" ON "usage_data" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "idx_study_participants_reserved_at" ON "study_participants" ("reserved_at") ',
    );
    await queryRunner.query('CREATE INDEX "idx_study_participants_email" ON "study_participants" ("email") ');
    await queryRunner.query('CREATE INDEX "idx_study_participants_code" ON "study_participants" ("participant_code") ');
    await queryRunner.query('CREATE INDEX "idx_study_participants_user_id" ON "study_participants" ("user_id") ');
    await queryRunner.query('CREATE INDEX "habit_library_requests_goal_idx" ON "habit_library_requests" ("goal") ');
    await queryRunner.query(
      'CREATE INDEX "habit_library_requests_user_id_idx" ON "habit_library_requests" ("user_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_lH8P0N3z82dEu7b6NNy2BkGu6I" ON "survey_answer_metadata" ("survey_answer_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_VhFZW0MmN9MK0j7a46Odm34bHx" ON "survey_answer_metadata" ("survey_id") ');
    await queryRunner.query('CREATE INDEX "IDX_eJjqSvhNbEEG63HJyKd599K2kl" ON "survey_answer_metadata" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_O5T2rc2utJxaGiBUfGp6IQr5m5" ON "survey_answer" ("survey_id") ');
    await queryRunner.query('CREATE INDEX "IDX_uO0G6ewX8s1TJ0U3EZcaKEJjys" ON "survey_answer" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_6ZPxFY25u1rVbx5e1P8uEbZdcZ" ON "survey" ("creator") ');
    await queryRunner.query('CREATE INDEX "IDX_team_join_codes_team_id" ON "team_join_codes" ("team_id") ');
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_team_join_codes_code" ON "team_join_codes" ("code") ');
    await queryRunner.query('CREATE INDEX "IDX_Q82YCfhFgtAVB7o36yvSQylSm" ON "courses" ("is_hidden") ');
    await queryRunner.query('CREATE INDEX "IDX_581692VXZdgrnLxFnNrGENy37" ON "courses" ("deleted") ');
    await queryRunner.query('CREATE INDEX "IDX_m6FzG2vfZZf9bQhgyJsPyzUDoQ" ON "courses" ("platform") ');
    await queryRunner.query('CREATE INDEX "lesson-completions_lesson_id_idx" ON "lesson-completions" ("lesson_id") ');
    await queryRunner.query('CREATE INDEX "lesson-completions_user_id_idx" ON "lesson-completions" ("user_id") ');
    await queryRunner.query('CREATE INDEX "lesson-completions_course_id_idx" ON "lesson-completions" ("course_id") ');
    await queryRunner.query('CREATE INDEX "IDX_external_api_tokens_prefix" ON "external_api_tokens" ("token_prefix") ');
    await queryRunner.query('CREATE INDEX "IDX_external_api_tokens_user_id" ON "external_api_tokens" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_5KHXo4YDbFf39Ji8vzk5h9sWSkb" ON "feedbacks" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_users_email_frequency" ON "users" ("email_frequency") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_accountability_buddy_invitation_status" ON "accountability_buddy" ("invitation_status") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_accountability_buddy_buddy_user_id" ON "accountability_buddy" ("buddy_user_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_accountability_buddy_user_id" ON "accountability_buddy" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_unlock_requests_status" ON "unlock_requests" ("status") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_unlock_requests_accountability_buddy_id" ON "unlock_requests" ("accountability_buddy_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_unlock_requests_user_id" ON "unlock_requests" ("user_id") ');
    await queryRunner.query('CREATE INDEX "calendars_user_id_idx" ON "calendars" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "calendar_excluded_keywords_user_id_idx" ON "calendar_excluded_keywords" ("user_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_9gmpnq10kzqlqi362nb93l79au" ON "platform_integrations" ("external_user_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_1jtfjwb582e5iddb0pa0c5jore" ON "platform_integrations" ("platform") ');
    await queryRunner.query('CREATE INDEX "IDX_axkykmeh2d0708qs85r1nwih1b" ON "platform_integrations" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_09f256fb7f9a05f0ed9927f406" ON "impact_events" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_notifications_related_entity" ON "notifications" ("related_entity_id", "related_entity_type") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_notifications_notification_type" ON "notifications" ("notification_type") ',
    );
    await queryRunner.query('CREATE INDEX "idx_team_to_admin_team_id" ON "team_to_admin" ("team_id") ');
    await queryRunner.query('CREATE INDEX "idx_team_to_admin_admin_id" ON "team_to_admin" ("admin_id") ');
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_team_to_member_team_id_member_id_unique" ON "team_to_member" ("team_id", "member_id") WHERE (member_id IS NOT NULL)',
    );
    await queryRunner.query('CREATE INDEX "IDX_nm1q170jaau0xd24ny7eawk17w" ON "team_to_member" ("email") ');
    await queryRunner.query('CREATE INDEX "IDX_4z5472st6c1jq1ix6yprjclh9w" ON "team_to_member" ("member_id") ');
    await queryRunner.query('CREATE INDEX "IDX_zriaxz223ikus58oc0pwgli9b8" ON "team_to_member" ("team_id") ');
    await queryRunner.query('CREATE INDEX "idx_focus_modes_user_id" ON "focus_modes" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_blocking_schedules_focus_mode_id" ON "blocking_schedules" ("focus_mode_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_blocking_schedules_user_id" ON "blocking_schedules" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_completed_focus_blocks_user_finish_time" ON "completed_focus_blocks" ("user_id", "finish_time") WHERE (finish_time IS NOT NULL)',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_cfb_user_created_at" ON "completed_focus_blocks" ("user_id", "created_at") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_to_do_project_id" ON "to_do" ("project_id") ');
    await queryRunner.query('CREATE INDEX "IDX_to_do_custom_status_id" ON "to_do" ("custom_status_id") ');
    await queryRunner.query('CREATE INDEX "IDX_to_do_assignee_id" ON "to_do" ("assignee_id") ');
    await queryRunner.query('CREATE INDEX "IDX_to_do_assigned_mcp_token_id" ON "to_do" ("assigned_mcp_token_id") ');
    await queryRunner.query('CREATE INDEX "IDX_projects_external_project_id" ON "projects" ("external_project_id") ');
    await queryRunner.query('CREATE INDEX "IDX_projects_deleted_at" ON "projects" ("deleted_at") ');
    await queryRunner.query('CREATE INDEX "IDX_projects_owner_id" ON "projects" ("owner_id") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_project_members_invitation_status" ON "project_members" ("invitation_status") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_project_members_email" ON "project_members" ("email") ');
    await queryRunner.query('CREATE INDEX "IDX_project_members_user_id" ON "project_members" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_project_members_project_id" ON "project_members" ("project_id") ');
    await queryRunner.query('CREATE INDEX "IDX_ro4m0f7l6atmy2wnnzt26ae192" ON "devices" ("operating_system") ');
    await queryRunner.query('CREATE INDEX "IDX_39wsf0gkn86nxvil06558nvgmv" ON "devices" ("app_version") ');
    await queryRunner.query('CREATE INDEX "IDX_pzsv0ck410cxrvd2v4smbas652" ON "devices" ("is_leader") ');
    await queryRunner.query(
      'CREATE INDEX "IDX_SQvsdEy02YnAsHD2X64lRzLT7Ro" ON "activity_sequences" ("custom_routine_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_zabc9tUdnbxe3zlOtx4Zy23z4YP" ON "custom_routines" ("start_time", "end_time") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_D5RRBIpEoX16Af70wnkTqAGgR15" ON "custom_routines" ("days_of_week") ');
    await queryRunner.query('CREATE INDEX "IDX_hvMmToO4T5tiNXK7QzA4BiW1Yns" ON "custom_routines" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_activities_geofence_id" ON "activities" ("geofence_id") ');
    await queryRunner.query('CREATE INDEX "IDX_activities_is_deleted" ON "activities" ("is_deleted") ');
    await queryRunner.query('CREATE INDEX "IDX_geofences_user_id" ON "geofences" ("user_id") ');
    await queryRunner.query(
      'CREATE INDEX "idx_ca_user_start_time_open" ON "completed_activities" ("user_id", "start_time") WHERE (finish_time IS NULL)',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_ca_user_start_time" ON "completed_activities" ("user_id", "start_time") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_ca_seq_created" ON "completed_activities" ("created_at", "completed_sequence_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_activity_template_embedding_vector" ON "activity_template_embedding" ("embedding") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_activity_template_embedding_activity_template_id" ON "activity_template_embedding" ("activity_template_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_KH0jea5gZu1t5wRx7hHp0zXzoQA" ON "activity_template_tag" ("activity_template_id") ',
    );
    await queryRunner.query('CREATE INDEX "IDX_gft9h2R0KMh1Evwj6fXUumUMZo" ON "tutorials" ("activity_template_id") ');
    await queryRunner.query('CREATE INDEX "IDX_hf2LeJsAdUGFZHUHerwf5xEbBt" ON "tutorials" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_qfVpYQoSmNdSGVGRxiA9Kj4Rge" ON "tutorials" ("activity_id") ');
    await queryRunner.query(
      'CREATE INDEX "idx_cas_user_start_time" ON "completed_activity_sequences" ("user_id", "start_time") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_cas_user_current" ON "completed_activity_sequences" ("user_id") WHERE (is_completed = false)',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_cas_user_created_at" ON "completed_activity_sequences" ("user_id", "created_at") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_o667gpof3w61vudhm34dhlwm8q" ON "completed_activity_sequences" ("is_completed") ',
    );
    await queryRunner.query(
      'ALTER TABLE "notes_todos" ADD CONSTRAINT "FK_notes_todos_note" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "notes_todos" ADD CONSTRAINT "FK_notes_todos_todo" FOREIGN KEY ("todo_id") REFERENCES "to_do"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "notes_tags" ADD CONSTRAINT "FK_notes_tags_note" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "notes_tags" ADD CONSTRAINT "FK_notes_tags_tag" FOREIGN KEY ("tag_id") REFERENCES "note_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "FK_webhook_subscriptions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "notes" ADD CONSTRAINT "FK_notes_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "notes" ADD CONSTRAINT "FK_notes_completed_activity" FOREIGN KEY ("completed_activity_id") REFERENCES "completed_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "note_tags" ADD CONSTRAINT "FK_note_tags_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "task_reactions" ADD CONSTRAINT "FK_task_reactions_task" FOREIGN KEY ("task_id") REFERENCES "to_do"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "task_reactions" ADD CONSTRAINT "FK_task_reactions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "task_comment_reactions" ADD CONSTRAINT "FK_task_comment_reactions_comment" FOREIGN KEY ("comment_id") REFERENCES "task_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "task_comment_reactions" ADD CONSTRAINT "FK_task_comment_reactions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "announcement_views" ADD CONSTRAINT "FK_announcement_views_announcement" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "flanker_tests" ADD CONSTRAINT "flanker_tests_study_participant_id_fkey" FOREIGN KEY ("study_participant_id") REFERENCES "study_participants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "usage_data" ADD CONSTRAINT "fk_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "habit_library_requests" ADD CONSTRAINT "habit_library_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "survey_answer_metadata" ADD CONSTRAINT "FK_R3i8H70N6owNahla6NAHrBKJMP" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "survey_answer_metadata" ADD CONSTRAINT "FK_ismRaV8by7hUqi8QfP2uE5GXsP" FOREIGN KEY ("survey_id") REFERENCES "survey"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "survey_answer_metadata" ADD CONSTRAINT "FK_Stvl6MJ9MsMUpVG30FG8wp3LIz" FOREIGN KEY ("survey_answer_id") REFERENCES "survey_answer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "survey_answer" ADD CONSTRAINT "FK_oQ5zABu5D2GXIcmNV19r1EGFU4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "survey_answer" ADD CONSTRAINT "FK_pXZz2xypWEl7I9Gx2m23Ui5lSY" FOREIGN KEY ("survey_id") REFERENCES "survey"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "survey" ADD CONSTRAINT "FK_u6eHtuWu7rv7UX4xH0QwN6Fu3Si" FOREIGN KEY ("creator") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "team_join_codes" ADD CONSTRAINT "FK_team_join_codes_team" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "lesson-completions" ADD CONSTRAINT "lesson-completions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "lesson-completions" ADD CONSTRAINT "lesson-completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "lesson-completions" ADD CONSTRAINT "lesson-completions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "external_api_tokens" ADD CONSTRAINT "FK_external_api_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_bcd06c006e1f409075f80acb73a" FOREIGN KEY ("member_of_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "accountability_buddy" ADD CONSTRAINT "FK_accountability_buddy_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "accountability_buddy" ADD CONSTRAINT "FK_accountability_buddy_buddy_user_id" FOREIGN KEY ("buddy_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "unlock_requests" ADD CONSTRAINT "FK_unlock_requests_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "unlock_requests" ADD CONSTRAINT "FK_unlock_requests_accountability_buddy_id" FOREIGN KEY ("accountability_buddy_id") REFERENCES "accountability_buddy"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "impact_events" ADD CONSTRAINT "FK_09f256fb7f9a05f0ed9927f406b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "focus_modes" ADD CONSTRAINT "FK_9d1b45fc85df3dab66ecf525e33" FOREIGN KEY ("focus_mode_template_id") REFERENCES "focus_mode_templates"("id") ON DELETE NO ACTION ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "blocking_schedules" ADD CONSTRAINT "FK_blocking_schedules_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "blocking_schedules" ADD CONSTRAINT "FK_blocking_schedules_focus_mode_id" FOREIGN KEY ("focus_mode_id") REFERENCES "focus_modes"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "to_do" ADD CONSTRAINT "to_do_assigned_mcp_token_id_fkey" FOREIGN KEY ("assigned_mcp_token_id") REFERENCES "external_api_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "to_do" ADD CONSTRAINT "FK_to_do_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "to_do" ADD CONSTRAINT "FK_to_do_assignee_id" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "projects" ADD CONSTRAINT "FK_projects_owner_id" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "project_members" ADD CONSTRAINT "FK_project_members_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "project_members" ADD CONSTRAINT "FK_project_members_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_sequences" ADD CONSTRAINT "activity_sequences_custom_routine_id_fkey" FOREIGN KEY ("custom_routine_id") REFERENCES "custom_routines"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "custom_routines" ADD CONSTRAINT "FK_oW9MddBEb0sRCA9KbuQ0upFWQ95" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ADD CONSTRAINT "FK_activities_geofence_id" FOREIGN KEY ("geofence_id") REFERENCES "geofences"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "geofences" ADD CONSTRAINT "FK_geofences_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "geofences" ADD CONSTRAINT "FK_geofences_associated_routine_id" FOREIGN KEY ("associated_routine_id") REFERENCES "activity_sequences"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_activities" ADD CONSTRAINT "FK_completed_activities_activity_id" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_template_embedding" ADD CONSTRAINT "FK_activity_template_embedding_activity_template_id" FOREIGN KEY ("activity_template_id") REFERENCES "activity_template"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activity_template_tag" ADD CONSTRAINT "FK_n8jLUZMVEBRMUiL96TPgvk63qs5" FOREIGN KEY ("activity_template_id") REFERENCES "activity_template"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "tutorials" ADD CONSTRAINT "tutorials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "tutorials" ADD CONSTRAINT "tutorials_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "tutorials" ADD CONSTRAINT "tutorials_activity_template_id_fkey" FOREIGN KEY ("activity_template_id") REFERENCES "activity_template"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
  }
}
