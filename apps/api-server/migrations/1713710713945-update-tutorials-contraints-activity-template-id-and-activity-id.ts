import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTutorialsContraintsActivityTemplateIdAndActivityId1713710713945 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "tutorials" DROP CONSTRAINT IF EXISTS tutorials_activity_id_fkey;
        ALTER TABLE "tutorials" ADD CONSTRAINT tutorials_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES "activities" ON DELETE SET NULL ON UPDATE CASCADE;
        ALTER TABLE "tutorials" DROP CONSTRAINT IF EXISTS tutorials_activity_template_id_fkey;
        ALTER TABLE "tutorials" ADD CONSTRAINT tutorials_activity_template_id_fkey FOREIGN KEY (activity_template_id) REFERENCES "activity_template" ON DELETE SET NULL ON UPDATE CASCADE;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "tutorials" DROP CONSTRAINT IF EXISTS tutorials_activity_id_fkey;
        ALTER TABLE "tutorials" ADD CONSTRAINT tutorials_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES "activities" ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "tutorials" DROP CONSTRAINT IF EXISTS tutorials_activity_template_id_fkey;
        ALTER TABLE "tutorials" ADD CONSTRAINT tutorials_activity_template_id_fkey FOREIGN KEY (activity_template_id) REFERENCES "activity_template" ON DELETE CASCADE ON UPDATE CASCADE;
        `);
  }
}
