import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableActivityTemplateTagsAddUniqueConstraintActivityTemplateId1715001657004
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "activity_template_tag" ADD CONSTRAINT unique_activity_template_id UNIQUE ("activity_template_id");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "activity_template_tag" DROP CONSTRAINT IF EXISTS unique_activity_template_id;
 `);
  }
}
