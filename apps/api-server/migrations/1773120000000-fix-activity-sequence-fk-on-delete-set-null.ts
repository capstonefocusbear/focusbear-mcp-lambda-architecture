import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix FK constraint violations on activity_sequences → users (Focus-Bear/backend#1747).
 *
 * Root cause: users.current_activity_sequence_id, users.last_completed_sequence_id, and
 * users.current_activity_id are FK references with ON DELETE NO ACTION (default), which
 * blocks deletion of activity_sequences / activities while any user still references them.
 *
 * Fix: Change all three FKs to ON DELETE SET NULL so that deleting a referenced sequence
 * or activity simply NULLs the user pointer rather than throwing a constraint violation.
 *
 * Pre-deploy SQL check for orphaned rows (run in production before applying migration):
 *
 *   SELECT id, current_activity_sequence_id FROM users
 *   WHERE current_activity_sequence_id IS NOT NULL
 *     AND current_activity_sequence_id NOT IN (SELECT id FROM activity_sequences);
 *
 *   SELECT id, last_completed_sequence_id FROM users
 *   WHERE last_completed_sequence_id IS NOT NULL
 *     AND last_completed_sequence_id NOT IN (SELECT id FROM activity_sequences);
 *
 *   SELECT id, current_activity_id FROM users
 *   WHERE current_activity_id IS NOT NULL
 *     AND current_activity_id NOT IN (SELECT id FROM activities);
 *
 * If orphaned rows exist, NULL them before running the migration:
 *
 *   UPDATE users SET current_activity_sequence_id = NULL
 *   WHERE current_activity_sequence_id NOT IN (SELECT id FROM activity_sequences);
 *
 *   UPDATE users SET last_completed_sequence_id = NULL
 *   WHERE last_completed_sequence_id NOT IN (SELECT id FROM activity_sequences);
 *
 *   UPDATE users SET current_activity_id = NULL
 *   WHERE current_activity_id NOT IN (SELECT id FROM activities);
 */
export class FixActivitySequenceFkOnDeleteSetNull1773120000000 implements MigrationInterface {
  name = 'FixActivitySequenceFkOnDeleteSetNull1773120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fix current_activity_sequence_id FK: NO ACTION -> SET NULL
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_b4bcb4a59eaf7d5eeab66682cdd"');
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_b4bcb4a59eaf7d5eeab66682cdd" FOREIGN KEY ("current_activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );

    // Fix last_completed_sequence_id FK: NO ACTION -> SET NULL
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_09abc56892304e353d620ee5e96"');
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_09abc56892304e353d620ee5e96" FOREIGN KEY ("last_completed_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );

    // Fix current_activity_id FK: NO ACTION -> SET NULL (activities are also deleted during habit-pack uninstall)
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_0dbd1834dcec5ba6da8c3810821"');
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_0dbd1834dcec5ba6da8c3810821" FOREIGN KEY ("current_activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore current_activity_id FK to original NO ACTION
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_0dbd1834dcec5ba6da8c3810821"');
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_0dbd1834dcec5ba6da8c3810821" FOREIGN KEY ("current_activity_id") REFERENCES "activities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );

    // Restore last_completed_sequence_id FK to original NO ACTION
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_09abc56892304e353d620ee5e96"');
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_09abc56892304e353d620ee5e96" FOREIGN KEY ("last_completed_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );

    // Restore current_activity_sequence_id FK to original NO ACTION
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_b4bcb4a59eaf7d5eeab66682cdd"');
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_b4bcb4a59eaf7d5eeab66682cdd" FOREIGN KEY ("current_activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
  }
}
