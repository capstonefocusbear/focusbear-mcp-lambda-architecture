import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTutorialsAddMakeActivityTemplateIdNullable1713709802783 implements MigrationInterface {
  name = 'UpdateTutorialsAddMakeActivityTemplateIdNullable1713709802783';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "tutorials" ALTER COLUMN "activity_template_id" DROP NOT NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "tutorials" ALTER COLUMN "activity_template_id" SET NOT NULL');
  }
}
