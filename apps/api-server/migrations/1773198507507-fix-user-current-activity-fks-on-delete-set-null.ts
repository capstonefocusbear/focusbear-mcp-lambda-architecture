import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix FK constraint violations on activity_sequences / activities -> users.
 *
 * Root cause: users.current_activity_sequence_id, users.last_completed_sequence_id, and
 * users.current_activity_id are FK references with ON DELETE NO ACTION, which blocks
 * deletion of activity_sequences / activities while any user still references them.
 *
 * Fix: Change all three FKs to ON DELETE SET NULL so deleting a referenced sequence
 * or activity clears the user pointer instead of throwing a constraint violation.
 */
export class FixUserCurrentActivityFksOnDeleteSetNull1773198507507 implements MigrationInterface {
  name = 'FixUserCurrentActivityFksOnDeleteSetNull1773198507507';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_b4bcb4a59eaf7d5eeab66682cdd"');
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_b4bcb4a59eaf7d5eeab66682cdd" FOREIGN KEY ("current_activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );

    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_09abc56892304e353d620ee5e96"');
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_09abc56892304e353d620ee5e96" FOREIGN KEY ("last_completed_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );

    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_0dbd1834dcec5ba6da8c3810821"');
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_0dbd1834dcec5ba6da8c3810821" FOREIGN KEY ("current_activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_0dbd1834dcec5ba6da8c3810821"');
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_0dbd1834dcec5ba6da8c3810821" FOREIGN KEY ("current_activity_id") REFERENCES "activities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );

    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_09abc56892304e353d620ee5e96"');
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_09abc56892304e353d620ee5e96" FOREIGN KEY ("last_completed_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );

    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "FK_b4bcb4a59eaf7d5eeab66682cdd"');
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_b4bcb4a59eaf7d5eeab66682cdd" FOREIGN KEY ("current_activity_sequence_id") REFERENCES "activity_sequences"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
  }
}
