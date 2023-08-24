import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableUserFeedback1692756949871 implements MigrationInterface {
  name = 'CreateTableUserFeedback1692756949871';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "user_feedback" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "user_id" uuid NOT NULL, "rating" numeric NOT NULL DEFAULT \'0\', "feedback" character varying(2500), "metadata" jsonb, CONSTRAINT "PK_94fb2b9415a96bde222d5e40598" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE INDEX "IDX_9eb49089eddfe8b11e18073cd7" ON "user_feedback" ("user_id") ');
    await queryRunner.query('ALTER TABLE "users" ADD "last_date_gave_feedback" TIMESTAMP WITH TIME ZONE');
    await queryRunner.query(
      'ALTER TABLE "user_feedback" ADD CONSTRAINT "FK_9eb49089eddfe8b11e18073cd79" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "user_feedback" DROP CONSTRAINT "FK_9eb49089eddfe8b11e18073cd79"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "last_date_gave_feedback"');
    await queryRunner.query('DROP INDEX "public"."IDX_9eb49089eddfe8b11e18073cd7"');
    await queryRunner.query('DROP TABLE "user_feedback"');
  }
}
