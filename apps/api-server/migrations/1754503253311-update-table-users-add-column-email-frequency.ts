import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddColumnEmailFrequency1754503253311 implements MigrationInterface {
  name = 'UpdateTableUsersAddColumnEmailFrequency1754503253311';
  
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if email_frequency_enum exists, create if not
    await queryRunner.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_frequency_enum') THEN 
          CREATE TYPE "email_frequency_enum" AS ENUM ('daily', 'weekly', 'monthly', 'unsubscribed');
        END IF;
      END $$;
    `);

    // Check if email_frequency column exists, add if not  
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'users' AND column_name = 'email_frequency') THEN
          ALTER TABLE "users" 
          ADD COLUMN "email_frequency" "email_frequency_enum" DEFAULT 'weekly';
        END IF;
      END $$;
    `);

    // Add index for performance (with conditional creation)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_email_frequency" ON "users" ("email_frequency");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email_frequency";`);
    
    // Only drop the column if it was created by this migration
    // In practice, we may want to keep the column but this provides a clean rollback
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'email_frequency') THEN
          ALTER TABLE "users" DROP COLUMN "email_frequency";
        END IF;
      END $$;
    `);
    
    await queryRunner.query(`DROP TYPE IF EXISTS "email_frequency_enum";`);
  }
}
