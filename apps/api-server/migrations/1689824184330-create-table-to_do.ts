import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableToDo1689824184330 implements MigrationInterface {
  name = 'CreateTableToDo1689824184330';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TYPE \"public\".\"to_do_status_enum\" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')",
    );
    await queryRunner.query(
      'CREATE TABLE "to_do" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "user_id" uuid NOT NULL, "focus_type" uuid, "title" character varying(255), "details" character varying(2000), "due_date" TIMESTAMP WITH TIME ZONE, "eisenhower_quadrant" smallint DEFAULT \'1\', "status" "public"."to_do_status_enum" NOT NULL DEFAULT \'NOT_STARTED\', CONSTRAINT "PK_19d14b861427e18d619639c8f2b" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE INDEX "IDX_f95b58e1f020b1646b8a672578" ON "to_do" ("user_id") ');
    await queryRunner.query('CREATE INDEX "IDX_3e65857b8252b1dad48e2dbd2e" ON "to_do" ("focus_type") ');
    await queryRunner.query(
      'ALTER TABLE "to_do" ADD CONSTRAINT "FK_f95b58e1f020b1646b8a6725785" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "to_do" ADD CONSTRAINT "FK_3e65857b8252b1dad48e2dbd2e9" FOREIGN KEY ("focus_type") REFERENCES "focus_modes"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "to_do" DROP CONSTRAINT "FK_3e65857b8252b1dad48e2dbd2e9"');
    await queryRunner.query('ALTER TABLE "to_do" DROP CONSTRAINT "FK_f95b58e1f020b1646b8a6725785"');
    await queryRunner.query('DROP TABLE "to_do"');
    await queryRunner.query('DROP TYPE "public"."to_do_status_enum"');
  }
}
