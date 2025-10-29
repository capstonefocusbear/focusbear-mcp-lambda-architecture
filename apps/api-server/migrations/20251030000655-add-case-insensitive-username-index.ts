import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCaseInsensitiveUsernameIndex20251030000655 implements MigrationInterface {
    name = 'AddCaseInsensitiveUsernameIndex20251030000655';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.startTransaction();
        try {
            // 1️⃣ Drop any old case-sensitive constraint/index
            await queryRunner.query(`
        ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "UQ_fe0bb3f6520ee0469504521e710";
      `);
            await queryRunner.query(`
        DROP INDEX IF EXISTS user_username_idx;
      `);

            // 2️⃣ Create case-insensitive unique index on LOWER(username)
            await queryRunner.query(`
        CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS user_username_lower_uidx
        ON "users" (LOWER(username));
      `);

            await queryRunner.commitTransaction();
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.startTransaction();
        try {
            await queryRunner.query(`
        DROP INDEX IF EXISTS user_username_lower_uidx;
      `);
            // Optional: restore original unique constraint if you had one
            await queryRunner.query(`
        ALTER TABLE "users" ADD CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE (username);
      `);
            await queryRunner.commitTransaction();
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        }
    }
}
