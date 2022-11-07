import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTableUsersAddFieldSignedUpViaHabitPack1667787812249 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" ADD COLUMN "signed_up_via_habit_pack" UUID REFERENCES "habit_packs";

        CREATE INDEX ON "users" ("signed_up_via_habit_pack");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" DROP COLUMN IF EXISTS "signed_up_via_habit_pack";
    `);
  }
}
