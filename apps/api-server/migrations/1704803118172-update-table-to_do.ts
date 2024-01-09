import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableToDo1704803118172 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "to_do" DROP COLUMN "status"');
    await queryRunner.query('ALTER TABLE "to_do" ADD COLUMN "status" character varying(255)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "to_do" DROP COLUMN "status"');
    await queryRunner.query(
      'ALTER TABLE "to_do" ADD COLUMN "status" "public"."to_do_status_enum" NOT NULL DEFAULT \'NOT_STARTED\'',
    );
  }
}
