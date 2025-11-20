import { MigrationInterface, QueryRunner } from 'typeorm';

export const transaction = 'none';

type DuplicateRow = {
  normalized_username: string;
  user_ids: string[];
};

export class AddCaseInsensitiveUsernameIndex1762263685811 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const duplicates = (await queryRunner.query(`
      SELECT LOWER(username) AS normalized_username, ARRAY_AGG(id)::text[] AS user_ids
      FROM users
      WHERE username IS NOT NULL
      GROUP BY LOWER(username)
      HAVING COUNT(*) > 1;
    `)) as DuplicateRow[];

    if (duplicates.length > 0) {
      const conflicts = duplicates
        .map(({ normalized_username, user_ids }) => `${normalized_username} (ids: ${user_ids.join(', ')})`)
        .join('; ');
      throw new Error(
        `Case-insensitive duplicate usernames must be resolved before running this migration. Conflicts: ${conflicts}`,
      );
    }

    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "UQ_fe0bb3f6520ee0469504521e710";
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS user_username_idx;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS user_username_lower_uidx
      ON "users" (LOWER(username));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS user_username_lower_uidx;
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE (username);
    `);
  }
}
