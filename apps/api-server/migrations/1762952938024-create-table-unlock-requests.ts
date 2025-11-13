import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableUnlockRequests1762952938024 implements MigrationInterface {
  name = 'CreateTableUnlockRequests1762952938024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
             CREATE TYPE "unlock_request_status_enum" AS ENUM('pending', 'approved', 'rejected', 'used')
          `);

    await queryRunner.query(`
            CREATE TABLE "unlock_requests" (
              "id" uuid NOT NULL DEFAULT gen_random_uuid(),
              "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
              "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
              "user_id" uuid NOT NULL,
              "accountability_buddy_id" uuid NOT NULL,
              "reason" text,
              "status" "unlock_request_status_enum" NOT NULL DEFAULT 'pending',
              "approved_at" TIMESTAMP WITH TIME ZONE,
              "unlock_duration_minutes" integer,
              CONSTRAINT "PK_unlock_requests" PRIMARY KEY ("id")
            )
          `);

    await queryRunner.query(`
            CREATE INDEX "IDX_unlock_requests_user_id" ON "unlock_requests" ("user_id");
            CREATE INDEX "IDX_unlock_requests_accountability_buddy_id" ON "unlock_requests" ("accountability_buddy_id");
            CREATE INDEX "IDX_unlock_requests_status" ON "unlock_requests" ("status")
          `);

    await queryRunner.query(`
            ALTER TABLE "unlock_requests" 
            ADD CONSTRAINT "FK_unlock_requests_user_id" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
          `);

    await queryRunner.query(`
            ALTER TABLE "unlock_requests" 
            ADD CONSTRAINT "FK_unlock_requests_accountability_buddy_id" 
            FOREIGN KEY ("accountability_buddy_id") REFERENCES "accountability_buddy"("id") ON DELETE CASCADE ON UPDATE CASCADE
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "unlock_requests" DROP CONSTRAINT IF EXISTS "FK_unlock_requests_user_id";
            ALTER TABLE "unlock_requests" DROP CONSTRAINT IF EXISTS "FK_unlock_requests_accountability_buddy_id"
          `);

    await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_unlock_requests_status";
            DROP INDEX IF EXISTS "IDX_unlock_requests_accountability_buddy_id";
            DROP INDEX IF EXISTS "IDX_unlock_requests_user_id"
          `);

    await queryRunner.query(`
            DROP TABLE IF EXISTS "unlock_requests";
            DROP TYPE IF EXISTS "unlock_request_status_enum"
          `);
  }
}
