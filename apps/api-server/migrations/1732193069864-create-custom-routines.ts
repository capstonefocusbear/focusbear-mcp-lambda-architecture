import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomRoutines1732193069864 implements MigrationInterface {
  name = 'CreateCustomRoutines1732193069864';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."custom_routine_trigger_enum" AS ENUM('ON_DEMAND', 'ON_SCHEDULE');
          `);

    await queryRunner.query(`
            CREATE TABLE "custom_routines" (
              "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              "name" VARCHAR NOT NULL,
              "trigger" "public"."custom_routine_trigger_enum" NOT NULL DEFAULT 'ON_DEMAND',
              "days_of_week" JSONB NOT NULL DEFAULT '["ALL"]'::jsonb,
              "start_time" VARCHAR(255),
              "end_time" VARCHAR(255),
              "user_id" uuid NOT NULL,
              "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
              "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
          `);

    await queryRunner.query(`
            CREATE INDEX "IDX_hvMmToO4T5tiNXK7QzA4BiW1Yns" ON "custom_routines" ("user_id");
            CREATE INDEX "IDX_D5RRBIpEoX16Af70wnkTqAGgR15" ON "custom_routines" USING gin ("days_of_week");
            CREATE INDEX "IDX_zabc9tUdnbxe3zlOtx4Zy23z4YP" ON "custom_routines" ("start_time", "end_time");

            ALTER TABLE "custom_routines" ADD CONSTRAINT "FK_oW9MddBEb0sRCA9KbuQ0upFWQ95" FOREIGN KEY ("user_id") REFERENCES "users"("id");
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "custom_routines" DROP CONSTRAINT IF EXISTS "FK_oW9MddBEb0sRCA9KbuQ0upFWQ95";
            DROP TYPE IF EXISTS "public"."IDX_D5RRBIpEoX16Af70wnkTqAGgR15";
            DROP TYPE IF EXISTS "public"."IDX_zabc9tUdnbxe3zlOtx4Zy23z4YP";
            DROP TYPE IF EXISTS "public"."IDX_hvMmToO4T5tiNXK7QzA4BiW1Yns";
            DROP TABLE IF EXISTS "custom_routines";
            DROP TYPE IF EXISTS "public"."custom_routine_trigger_enum";
          `);
  }
}
