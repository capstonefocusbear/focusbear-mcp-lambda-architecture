import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixUserDeleteCascadeConstraints1772512200000 implements MigrationInterface {
  name = 'FixUserDeleteCascadeConstraints1772512200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fix user_feedback: user_id is NOT NULL but FK was ON DELETE SET NULL (contradictory)
    // Change to CASCADE so feedback is deleted when user is deleted
    await queryRunner.query('ALTER TABLE "user_feedback" DROP CONSTRAINT "FK_9eb49089eddfe8b11e18073cd79"');
    await queryRunner.query(
      'ALTER TABLE "user_feedback" ADD CONSTRAINT "FK_9eb49089eddfe8b11e18073cd79" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );

    // Fix user_consent: user_id is NOT NULL but FK was ON DELETE SET NULL (contradictory)
    // Change to CASCADE so consent records are deleted when user is deleted
    await queryRunner.query('ALTER TABLE "user_consent" DROP CONSTRAINT "FK_4174e45dd98eb587c2348b8ca1d"');
    await queryRunner.query(
      'ALTER TABLE "user_consent" ADD CONSTRAINT "FK_4174e45dd98eb587c2348b8ca1d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );

    // Fix admin_access_requests: admin_user_id is NOT NULL but FK was ON DELETE SET NULL (contradictory)
    // Change to CASCADE so access requests are deleted when admin user is deleted
    await queryRunner.query(
      'ALTER TABLE "admin_access_requests" DROP CONSTRAINT "FK_7e4952c93107f80cbfb967c9f30"',
    );
    await queryRunner.query(
      'ALTER TABLE "admin_access_requests" ADD CONSTRAINT "FK_7e4952c93107f80cbfb967c9f30" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert admin_access_requests to SET NULL
    await queryRunner.query(
      'ALTER TABLE "admin_access_requests" DROP CONSTRAINT "FK_7e4952c93107f80cbfb967c9f30"',
    );
    await queryRunner.query(
      'ALTER TABLE "admin_access_requests" ADD CONSTRAINT "FK_7e4952c93107f80cbfb967c9f30" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );

    // Revert user_consent to SET NULL
    await queryRunner.query('ALTER TABLE "user_consent" DROP CONSTRAINT "FK_4174e45dd98eb587c2348b8ca1d"');
    await queryRunner.query(
      'ALTER TABLE "user_consent" ADD CONSTRAINT "FK_4174e45dd98eb587c2348b8ca1d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );

    // Revert user_feedback to SET NULL
    await queryRunner.query('ALTER TABLE "user_feedback" DROP CONSTRAINT "FK_9eb49089eddfe8b11e18073cd79"');
    await queryRunner.query(
      'ALTER TABLE "user_feedback" ADD CONSTRAINT "FK_9eb49089eddfe8b11e18073cd79" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
  }
}
