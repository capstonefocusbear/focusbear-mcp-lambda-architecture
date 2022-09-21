import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersRenameField1663758891161 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users 
        RENAME COLUMN first_name TO name;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users 
        RENAME COLUMN name TO first_name;
    `);
  }
}
