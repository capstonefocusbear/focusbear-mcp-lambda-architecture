import { MigrationInterface, QueryRunner } from 'typeorm';

export class createLogQuantityQuestionTables1680509779283 implements MigrationInterface {
  name = 'createLogQuantityQuestionTables1680509779283';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TYPE "public"."log_quantity_questions_log_summary_type_enum" AS ENUM(\'SUM\', \'AVG\')',
    );
    await queryRunner.query(
      'CREATE TABLE "log_quantity_questions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "user_id" uuid NOT NULL, "activity_id" uuid, "activity_template_id" uuid, "question" character varying NOT NULL, "min_value_description" character varying NOT NULL, "max_value_description" character varying NOT NULL, "min_value" numeric NOT NULL DEFAULT \'0\', "max_value" numeric NOT NULL DEFAULT \'0\', "log_summary_type" "public"."log_quantity_questions_log_summary_type_enum" NOT NULL DEFAULT \'SUM\', CONSTRAINT "PK_83cd1606b0535d33d48c6a762c4" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "log_quantity_answers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "user_id" uuid NOT NULL, "activity_id" uuid NOT NULL, "question_id" uuid NOT NULL, "completed_activity_log_id" uuid NOT NULL, "logged_value" numeric NOT NULL DEFAULT \'0\', "date_logged" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), CONSTRAINT "PK_4ed76a4c23d19dbdf9ca57a1aac" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'ALTER TABLE "log_quantity_questions" ADD CONSTRAINT "FK_5789f0af69fb3424d579e3ce40d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "log_quantity_questions" ADD CONSTRAINT "FK_6b4b50fe00a4e9be63f1a38f68f" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "log_quantity_questions" ADD CONSTRAINT "FK_00d70f5b6839a92c669b552af2f" FOREIGN KEY ("activity_template_id") REFERENCES "activity_template"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "log_quantity_answers" ADD CONSTRAINT "FK_8dcb6d1db7c348e8d8fa24f737b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "log_quantity_answers" ADD CONSTRAINT "FK_d9a33a0b971780e280c8ca87cc1" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "log_quantity_answers" ADD CONSTRAINT "FK_d70ba16ca89ef16a15870df4155" FOREIGN KEY ("question_id") REFERENCES "log_quantity_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "log_quantity_answers" ADD CONSTRAINT "FK_076ce4f4f50997f4eba15e237e1" FOREIGN KEY ("completed_activity_log_id") REFERENCES "completed_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "log_quantity_answers" DROP CONSTRAINT "FK_076ce4f4f50997f4eba15e237e1"');
    await queryRunner.query('ALTER TABLE "log_quantity_answers" DROP CONSTRAINT "FK_d70ba16ca89ef16a15870df4155"');
    await queryRunner.query('ALTER TABLE "log_quantity_answers" DROP CONSTRAINT "FK_d9a33a0b971780e280c8ca87cc1"');
    await queryRunner.query('ALTER TABLE "log_quantity_answers" DROP CONSTRAINT "FK_8dcb6d1db7c348e8d8fa24f737b"');
    await queryRunner.query('ALTER TABLE "log_quantity_questions" DROP CONSTRAINT "FK_00d70f5b6839a92c669b552af2f"');
    await queryRunner.query('ALTER TABLE "log_quantity_questions" DROP CONSTRAINT "FK_6b4b50fe00a4e9be63f1a38f68f"');
    await queryRunner.query('ALTER TABLE "log_quantity_questions" DROP CONSTRAINT "FK_5789f0af69fb3424d579e3ce40d"');
    await queryRunner.query('DROP TABLE "log_quantity_answers"');
    await queryRunner.query('DROP TABLE "log_quantity_questions"');
    await queryRunner.query('DROP TYPE "public"."log_quantity_questions_log_summary_type_enum"');
  }
}
