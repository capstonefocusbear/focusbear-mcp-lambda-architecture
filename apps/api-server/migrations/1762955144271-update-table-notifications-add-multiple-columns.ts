import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableNotificationsAddMultipleColumns1762955144271 implements MigrationInterface {
  name = 'UpdateTableNotificationsAddMultipleColumns1762955144271';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TYPE "notification_type_enum" AS ENUM(
          'calendar_event',
          'accountability_buddy_invitation',
          'accountability_buddy_invitation_accepted',
          'unlock_request_received',
          'unlock_request_approved',
          'unlock_request_rejected'
        );
      `);

    await queryRunner.query(`
        ALTER TABLE "notifications"
        ADD COLUMN IF NOT EXISTS "notification_type" "notification_type_enum" DEFAULT 'calendar_event',
        ADD COLUMN IF NOT EXISTS "action_url" character varying(500),
        ADD COLUMN IF NOT EXISTS "related_entity_id" uuid,
        ADD COLUMN IF NOT EXISTS "related_entity_type" character varying(100);
    `);

    await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_notifications_notification_type" ON "notifications" ("notification_type");
        CREATE INDEX IF NOT EXISTS "IDX_notifications_related_entity" ON "notifications" ("related_entity_id", "related_entity_type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP INDEX IF EXISTS "IDX_notifications_related_entity";
        DROP INDEX IF EXISTS "IDX_notifications_notification_type"
    `);

    await queryRunner.query(`
        ALTER TABLE "notifications"
        DROP COLUMN IF EXISTS "related_entity_type",
        DROP COLUMN IF EXISTS "related_entity_id",
        DROP COLUMN IF EXISTS "action_url",
        DROP COLUMN IF EXISTS "notification_type";
    `);

    await queryRunner.query('DROP TYPE "notification_type_enum"');
  }
}
