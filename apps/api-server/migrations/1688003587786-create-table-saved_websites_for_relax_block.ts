import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableSavedWebsitesForRelaxBlock1688003587786 implements MigrationInterface {
  name = 'CreateTableSavedWebsitesForRelaxBlock1688003587786';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "saved_websites_for_relax_block" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "user_id" uuid NOT NULL, "url" character varying NOT NULL, "title" character varying, "metadata" jsonb, CONSTRAINT "PK_f7561b963c846a7cc5c8d6ff318" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_8874091c79c6fc8a02e0578259" ON "saved_websites_for_relax_block" ("user_id") ',
    );
    await queryRunner.query(
      'ALTER TABLE "saved_websites_for_relax_block" ADD CONSTRAINT "FK_8874091c79c6fc8a02e0578259a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "saved_websites_for_relax_block" DROP CONSTRAINT "FK_8874091c79c6fc8a02e0578259a"',
    );
    await queryRunner.query('DROP INDEX "public"."IDX_8874091c79c6fc8a02e0578259"');
    await queryRunner.query('DROP TABLE "saved_websites_for_relax_block"');
  }
}
