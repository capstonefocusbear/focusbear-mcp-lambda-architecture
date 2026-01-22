import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableGeofences1769049033020 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "geofences" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "user_id" uuid NOT NULL,
                "name" character varying NOT NULL,
                                "latitude" character varying NOT NULL,
                                "longitude" character varying NOT NULL,
                "radius" integer NOT NULL DEFAULT 100,
                "trigger_after_time" time,
                "associated_routine_id" uuid,
                CONSTRAINT "PK_geofences" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_geofences_user_id" ON "geofences" ("user_id")
        `);

    await queryRunner.query(`
            ALTER TABLE "geofences" 
            ADD CONSTRAINT "FK_geofences_user_id" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "geofences" 
            ADD CONSTRAINT "FK_geofences_associated_routine_id" 
            FOREIGN KEY ("associated_routine_id") REFERENCES "activity_sequences"("id") ON DELETE SET NULL ON UPDATE CASCADE
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "geofences" DROP CONSTRAINT "FK_geofences_associated_routine_id"');
    await queryRunner.query('ALTER TABLE "geofences" DROP CONSTRAINT "FK_geofences_user_id"');
    await queryRunner.query('DROP INDEX "IDX_geofences_user_id"');
    await queryRunner.query('DROP TABLE "geofences"');
  }
}
