import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateEnumActivityTypeAddPropertyLibrary1673843524567 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TYPE "activity_types" ADD VALUE 'library';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TYPE "activity_types" IF EXISTS;
        CREATE TYPE "activity_types" AS ENUM ('break', 'morning', 'evening', 'standalone');
    `);
  }
}
