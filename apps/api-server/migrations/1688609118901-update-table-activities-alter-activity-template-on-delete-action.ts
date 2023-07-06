import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableActivitiesAlterActivityTemplateOnDeleteAction1688609118901 implements MigrationInterface {
  name = 'UpdateTableActivitiesAlterActivityTemplateOnDeleteAction1688609118901';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "FK_62b1bed769a3fa8d7f2bacf948c"');
    await queryRunner.query(
      'ALTER TABLE "activities" ADD CONSTRAINT "FK_62b1bed769a3fa8d7f2bacf948c" FOREIGN KEY ("activity_template_id") REFERENCES "activity_template"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "activities" DROP CONSTRAINT "FK_62b1bed769a3fa8d7f2bacf948c"');
    await queryRunner.query(
      'ALTER TABLE "activities" ADD CONSTRAINT "FK_62b1bed769a3fa8d7f2bacf948c" FOREIGN KEY ("activity_template_id") REFERENCES "activity_template"("id") ON DELETE NO ACTION ON UPDATE CASCADE',
    );
  }
}
