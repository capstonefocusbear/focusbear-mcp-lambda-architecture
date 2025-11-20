import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableAccountabilityBuddyMakeBuddyEmailNotNull1763629674352 implements MigrationInterface {
  name = 'UpdateTableAccountabilityBuddyMakeBuddyEmailNotNull1763629674352';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "accountability_buddy" ALTER COLUMN "buddy_email" SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "accountability_buddy" ALTER COLUMN "buddy_email" DROP NOT NULL;
    `);
  }
}
