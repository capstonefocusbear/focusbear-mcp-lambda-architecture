import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGeofenceIdToActivities1769049163134 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "activities" 
            ADD COLUMN "geofence_id" uuid
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_activities_geofence_id" ON "activities" ("geofence_id")
        `);

    await queryRunner.query(`
            ALTER TABLE "activities" 
            ADD CONSTRAINT "FK_activities_geofence_id" 
            FOREIGN KEY ("geofence_id") REFERENCES "geofences"("id") ON DELETE SET NULL ON UPDATE CASCADE
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "FK_activities_geofence_id"');
    await queryRunner.query('DROP INDEX "IDX_activities_geofence_id"');
    await queryRunner.query('ALTER TABLE "activities" DROP COLUMN "geofence_id"');
  }
}
