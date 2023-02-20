import { MigrationInterface, QueryRunner } from 'typeorm';

export class createTableAdminAccessRequests1676530714764 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE "admin_access_requests" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "admin_user_id" UUID REFERENCES "users",
            "access_reason" CHARACTER VARYING NOT NULL,
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );

        CREATE INDEX ON "admin_access_requests" ("admin_user_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE IF EXISTS "admin_access_requests";
    `);
  }
}
