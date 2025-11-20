import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableAccountabilityBuddy1762952920490 implements MigrationInterface {
  name = 'CreateTableAccountabilityBuddy1762952920490';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          CREATE TYPE "invitation_status_enum" AS ENUM('pending', 'accepted', 'rejected', 'expired')
        `);

    await queryRunner.query(`
          CREATE TABLE "accountability_buddy" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            "user_id" uuid NOT NULL,
            "buddy_user_id" uuid,
            "buddy_email" character varying(255),
            "invitation_status" "invitation_status_enum" NOT NULL DEFAULT 'pending',
            "invitation_sent_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "invitation_responded_at" TIMESTAMP WITH TIME ZONE,
            CONSTRAINT "PK_accountability_buddy" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_accountability_buddy_user_buddy_email" UNIQUE ("user_id", "buddy_email")
          )
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_accountability_buddy_user_id" ON "accountability_buddy" ("user_id");
            CREATE INDEX "IDX_accountability_buddy_buddy_user_id" ON "accountability_buddy" ("buddy_user_id");
            CREATE INDEX "IDX_accountability_buddy_invitation_status" ON "accountability_buddy" ("invitation_status")
          `);

    await queryRunner.query(`
            ALTER TABLE "accountability_buddy" 
            ADD CONSTRAINT "FK_accountability_buddy_user_id" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
          `);

    await queryRunner.query(`
            ALTER TABLE "accountability_buddy" 
            ADD CONSTRAINT "FK_accountability_buddy_buddy_user_id" 
            FOREIGN KEY ("buddy_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "accountability_buddy" DROP IF EXISTS CONSTRAINT "FK_accountability_buddy_buddy_user_id";
            ALTER TABLE "accountability_buddy" DROP IF EXISTS CONSTRAINT "FK_accountability_buddy_user_id"
          `);

    await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_accountability_buddy_invitation_status";
            DROP INDEX IF EXISTS "IDX_accountability_buddy_buddy_user_id";
            DROP INDEX IF EXISTS "IDX_accountability_buddy_user_id"
          `);

    await queryRunner.query(`
            DROP TABLE "accountability_buddy";
            DROP TYPE IF EXISTS "invitation_status_enum"
          `);
  }
}
