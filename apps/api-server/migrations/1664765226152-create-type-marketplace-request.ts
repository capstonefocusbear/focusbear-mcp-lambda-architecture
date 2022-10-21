import { MigrationInterface, QueryRunner } from 'typeorm';

export class createTypeMarketplaceRequest1664765226152 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TYPE "marketplace_request" AS ENUM ('requested', 'unrequested');
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TYPE "marketplace_request";
        `);
  }
}
