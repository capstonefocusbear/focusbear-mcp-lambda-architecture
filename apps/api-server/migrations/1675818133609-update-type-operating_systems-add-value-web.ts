import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTypeOperatingSystemsAddValueWeb1675818133609 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TYPE "operating_systems" ADD VALUE 'Web';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TYPE "operating_systems" IF EXISTS;
        CREATE TYPE "operating_systems" AS ENUM ('MacOS', 'Windows', 'Android', 'iOS');
    `);
  }
}
