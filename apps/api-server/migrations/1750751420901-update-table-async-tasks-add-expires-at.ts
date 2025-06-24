import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTableAsyncTasksAddExpiresAt1750751420901 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "async_tasks" 
            ADD COLUMN "expires_at" TIMESTAMPTZ
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "async_tasks" 
            DROP COLUMN "expires_at"
        `);
    }

}
