import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableActivityTemplateTags1714841179055 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
   CREATE TABLE "activity_template_tag" (
       "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       "tags" jsonb,
       "activity_template_id" uuid NOT NULL,
       "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), 
       "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
       constraint "FK_n8jLUZMVEBRMUiL96TPgvk63qs5" FOREIGN KEY ("activity_template_id") REFERENCES "activity_template"("id") ON DELETE CASCADE ON UPDATE CASCADE
   );
   
   CREATE INDEX "IDX_KH0jea5gZu1t5wRx7hHp0zXzoQA" ON "activity_template_tag" ("activity_template_id");
   `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    DROP INDEX IF EXISTS "public"."IDX_KH0jea5gZu1t5wRx7hHp0zXzoQA";
    ALTER TABLE "activity_template_tag" DROP CONSTRAINT IF EXISTS "FK_n8jLUZMVEBRMUiL96TPgvk63qs5";
    DROP TABLE IF EXISTS "activity_template_tag"
    `);
  }
}
