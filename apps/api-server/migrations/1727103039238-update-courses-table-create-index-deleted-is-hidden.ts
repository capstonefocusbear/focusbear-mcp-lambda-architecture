import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCoursesTableCreateIndexDeletedIsHidden1727103039238 implements MigrationInterface {
  name = 'UpdateCoursesTableCreateIndexDeletedIsHidden1727103039238';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX "IDX_581692VXZdgrnLxFnNrGENy37" ON "courses" ("deleted") ');
    await queryRunner.query('CREATE INDEX "IDX_Q82YCfhFgtAVB7o36yvSQylSm" ON "courses" ("is_hidden") ');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."IDX_581692VXZdgrnLxFnNrGENy37"');
    await queryRunner.query('DROP INDEX "public"."IDX_Q82YCfhFgtAVB7o36yvSQylSm"');
  }
}
