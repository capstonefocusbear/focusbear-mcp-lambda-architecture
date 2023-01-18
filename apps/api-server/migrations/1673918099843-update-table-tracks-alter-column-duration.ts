import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableTracksAlterColumnDuration1673918099843 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "tracks" ALTER COLUMN "duration" TYPE NUMERIC USING "duration"::NUMERIC;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "tracks" ALTER COLUMN "duration" TYPE VARCHAR USING "duration"::VARCHAR;
    `);
  }
}
