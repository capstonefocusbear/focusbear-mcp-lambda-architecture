import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableActivitySequencesSetTypeNotNullMakeTypeUserIdUnique1653554201095 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "activity_sequences"
          ALTER COLUMN "type" SET NOT NULL,
          ALTER COLUMN "user_id" SET NOT NULL
        ;
    
        CREATE UNIQUE INDEX ON "activity_sequences" ("type", "user_id");
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "activity_sequences"
          ALTER COLUMN "type" DROP NOT NULL,
          ALTER COLUMN "user_id" DROP NOT NULL
        ;
      `);
  }
}
