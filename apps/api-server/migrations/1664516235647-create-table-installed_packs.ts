import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableInstalledPacks1664516235647 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE "installed_packs" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "pack_id" UUID REFERENCES "habit_packs",
          "user_id" UUID REFERENCES "users",
          "installation_status" BOOLEAN DEFAULT 'false',
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
  
        CREATE INDEX ON "installed_packs" ("user_id");
        CREATE INDEX ON "installed_packs" ("pack_id");
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE IF EXISTS "installed_packs";
        `);
  }
}
