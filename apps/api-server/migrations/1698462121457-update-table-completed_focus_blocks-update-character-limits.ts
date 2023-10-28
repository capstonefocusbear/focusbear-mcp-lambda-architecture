import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableCompletedFocusBlocksUpdateCharacterLimits1698462121457 implements MigrationInterface {
  name = 'UpdateTableCompletedFocusBlocksUpdateCharacterLimits1698462121457';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE completed_focus_blocks ALTER COLUMN intention TYPE character varying(400)');
    await queryRunner.query('ALTER TABLE completed_focus_blocks ALTER COLUMN achievements TYPE character varying(400)');
    await queryRunner.query('ALTER TABLE completed_focus_blocks ALTER COLUMN distractions TYPE character varying(400)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE completed_focus_blocks ALTER COLUMN intention TYPE character varying(255)');
    await queryRunner.query('ALTER TABLE completed_focus_blocks ALTER COLUMN achievements TYPE character varying(255)');
    await queryRunner.query('ALTER TABLE completed_focus_blocks ALTER COLUMN distractions TYPE character varying(255)');
  }
}
