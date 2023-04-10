import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTablesLinkActivities1680664793432 implements MigrationInterface {
  name = 'updateTablesLinkActivities1680664793432';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "activity_template" ADD "linked_activity_template_id" uuid');
    await queryRunner.query('ALTER TABLE "log_quantity_questions" ADD "linked_question_id" uuid');
    await queryRunner.query('ALTER TABLE "activities" ADD "linked_activity_id" uuid');
    await queryRunner.query(
      'ALTER TABLE "activity_template" ADD CONSTRAINT "FK_f36d5c0cbc9c02a4eb4e4c5034d" FOREIGN KEY ("linked_activity_template_id") REFERENCES "activity_template"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "log_quantity_questions" ADD CONSTRAINT "FK_1671b0c5c0d01fe2e372df375d4" FOREIGN KEY ("linked_question_id") REFERENCES "log_quantity_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "activities" ADD CONSTRAINT "FK_6c4c1dbf9d88194cd5f8336aea1" FOREIGN KEY ("linked_activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "activities" DROP COLUMN "linked_activity_id"');
    await queryRunner.query('ALTER TABLE "log_quantity_questions" DROP COLUMN "linked_question_id"');
    await queryRunner.query('ALTER TABLE "activity_template" DROP COLUMN "linked_activity_template_id"');
  }
}
