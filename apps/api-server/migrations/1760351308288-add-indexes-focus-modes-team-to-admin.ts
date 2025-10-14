import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexesFocusModesTeamToAdmin1760351308288 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_focus_modes_user_id ON "focus_modes" ("user_id")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_team_to_admin_admin_id ON "team_to_admin" ("admin_id")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_team_to_admin_team_id ON "team_to_admin" ("team_id")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_team_to_admin_team_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_team_to_admin_admin_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_focus_modes_user_id');
  }
}
