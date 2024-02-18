import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTutorialsConstraint1708264643700 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    ALTER TABLE "tutorials" DROP CONSTRAINT IF EXISTS tutorials_activity_id_fkey;
    ALTER TABLE "tutorials" ADD CONSTRAINT tutorials_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES "activities" ON DELETE CASCADE ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    ALTER TABLE "tutorials" DROP CONSTRAINT IF EXISTS tutorials_activity_id_fkey;
    ALTER TABLE "tutorials" ADD CONSTRAINT tutorials_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES "activities" ON DELETE SET NULL ON UPDATE CASCADE
    `);
  }
}
