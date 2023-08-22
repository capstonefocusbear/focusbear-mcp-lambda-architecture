import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableImpactEvents1692623502704 implements MigrationInterface {
  name = 'CreateTableImpactEvents1692623502704';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "impact_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "user_id" uuid NOT NULL, "impact_category" "public"."impact_category_enum", "minutes" numeric DEFAULT \'0\', CONSTRAINT "PK_40731c7151fe4be3116e45ddf73" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE INDEX "IDX_09f256fb7f9a05f0ed9927f406" ON "impact_events" ("user_id") ');
    await queryRunner.query(
      'ALTER TABLE "impact_events" ADD CONSTRAINT "FK_09f256fb7f9a05f0ed9927f406b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "impact_events" DROP CONSTRAINT "FK_09f256fb7f9a05f0ed9927f406b"');
    await queryRunner.query('DROP INDEX "public"."IDX_09f256fb7f9a05f0ed9927f406"');
    await queryRunner.query('DROP TABLE "impact_events"');
  }
}
