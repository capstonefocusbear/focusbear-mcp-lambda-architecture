import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableBlockingSchedules1758845856956 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the blocking_schedules table
    await queryRunner.query(`
            CREATE TYPE "pause_friction_enum" AS ENUM('none', 'timer', '100_random_chars', 'password');
        `);

    await queryRunner.query(`
            CREATE TYPE "block_level_enum" AS ENUM('gentle', 'strict');
        `);

    await queryRunner.query(`
            CREATE TABLE "blocking_schedules" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "user_id" uuid NOT NULL,
                "name" character varying(255) NOT NULL,
                "start_time" time NOT NULL,
                "end_time" time NOT NULL,
                "days_of_week" jsonb NOT NULL,
                "focus_mode_id" uuid NOT NULL,
                "pause_friction" "pause_friction_enum" NOT NULL DEFAULT 'none',
                "block_level" "block_level_enum" NOT NULL DEFAULT 'strict',
                "is_ai_blocking_enabled" boolean NOT NULL DEFAULT false,
                CONSTRAINT "PK_blocking_schedules" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_blocking_schedules_user_id" ON "blocking_schedules" ("user_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_blocking_schedules_focus_mode_id" ON "blocking_schedules" ("focus_mode_id")
        `);

    await queryRunner.query(`
            ALTER TABLE "blocking_schedules" 
            ADD CONSTRAINT "FK_blocking_schedules_user_id" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "blocking_schedules" 
            ADD CONSTRAINT "FK_blocking_schedules_focus_mode_id" 
            FOREIGN KEY ("focus_mode_id") REFERENCES "focus_modes"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);

    // Data migration: Create blocking schedule records based on user's cutoff_time and startup_time
    // For each user, create a blocking schedule between cutoff_time and startup_time (e.g. 10pm to 6am)
    // using the "Block super distracting sites" focus mode
    await queryRunner.query(`
            INSERT INTO "blocking_schedules" (
                "user_id", 
                "name", 
                "start_time", 
                "end_time", 
                "days_of_week", 
                "focus_mode_id", 
                "pause_friction", 
                "block_level", 
                "is_ai_blocking_enabled"
            )
            SELECT 
                u.id as user_id,
                'Night Blocking' as name,
                u.shutdown_time::time as start_time,
                u.startup_time::time as end_time,
                '[0,1,2,3,4,5,6]'::jsonb as days_of_week,
                COALESCE(
                    (SELECT fm.id FROM focus_modes fm 
                     WHERE fm.user_id = u.id 
                     AND fm.name ILIKE '%block%super%distract%'
                     ORDER BY fm.created_at DESC 
                     LIMIT 1),
                    (SELECT fm.id FROM focus_modes fm 
                     WHERE fm.user_id = u.id 
                     AND (fm.name ILIKE '%block%' OR fm.name ILIKE '%distract%')
                     ORDER BY fm.created_at DESC 
                     LIMIT 1),
                    (SELECT fm.id FROM focus_modes fm 
                     WHERE fm.user_id = u.id 
                     ORDER BY fm.created_at ASC 
                     LIMIT 1)
                ) as focus_mode_id,
                'none' as pause_friction,
                'strict' as block_level,
                false as is_ai_blocking_enabled
            FROM users u
            WHERE u.shutdown_time IS NOT NULL 
            AND u.startup_time IS NOT NULL
            AND EXISTS (SELECT 1 FROM focus_modes fm WHERE fm.user_id = u.id)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "blocking_schedules"');
    await queryRunner.query('DROP TYPE "block_level_enum"');
    await queryRunner.query('DROP TYPE "pause_friction_enum"');
  }
}
