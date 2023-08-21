import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableActivitiesAddColumnImpactCategory1692585660188 implements MigrationInterface {
  name = 'UpdateTableActivitiesAddColumnImpactCategory1692585660188';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TYPE \"public\".\"impact_category_enum\" AS ENUM('hours_of_sleep', 'energy_level_upon_awakening', 'mood', 'perception_of_productivity', 'minutes_spent_on_distracting_websites', 'minutes_spent_postponing_app_blocks')",
    );
    await queryRunner.query('ALTER TABLE "activity_template" ADD "impact_category" "public"."impact_category_enum"');
    await queryRunner.query('ALTER TABLE "activities" ADD "impact_category" "public"."impact_category_enum"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "activities" DROP COLUMN "impact_category"');
    await queryRunner.query('DROP TYPE "public"."impact_category_enum"');
    await queryRunner.query('ALTER TABLE "activity_template" DROP COLUMN "impact_category"');
  }
}
