import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTutorialsTable1707403220411 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE "tutorials" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "name" VARCHAR(1000),
          "activity_id" UUID REFERENCES "activities" ON DELETE SET NULL ON UPDATE CASCADE,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
    
        CREATE INDEX "IDX_qfVpYQoSmNdSGVGRxiA9Kj4Rge" ON "tutorials" ("activity_id");
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    DROP TABLE IF EXISTS "tutorials";
    DROP INDEX IF EXISTS "public"."IDX_qfVpYQoSmNdSGVGRxiA9Kj4Rge";
    `);
  }
}
