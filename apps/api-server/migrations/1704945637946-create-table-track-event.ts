import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableTrackEvent1704945637946 implements MigrationInterface {
  name = 'CreateTableTrackEvent1704945637946';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "track_event" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "user_id" uuid NOT NULL, "event_type" character varying(255), "user_properties" jsonb, "event_data" jsonb, "operating_system" character varying(255), CONSTRAINT "PK_23f6f58e6a364142ebe5a91dc0f" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'ALTER TABLE "track_event" ADD CONSTRAINT "FK_a57aa79fc4950cd942c36211812" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "track_event" DROP CONSTRAINT "FK_a57aa79fc4950cd942c36211812"');
    await queryRunner.query('DROP TABLE "track_event"');
  }
}
