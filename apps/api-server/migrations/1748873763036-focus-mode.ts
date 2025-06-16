import { MigrationInterface, QueryRunner } from 'typeorm';

export class FocusMode1748873763036 implements MigrationInterface {
  name = 'FocusMode1748873763036';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "focus_modes" ALTER COLUMN "name" TYPE varchar(512) USING "name"::varchar(512)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "focus_modes" ALTER COLUMN "name" TYPE varchar(255) USING "name"::varchar(255)',
    );
  }
}
