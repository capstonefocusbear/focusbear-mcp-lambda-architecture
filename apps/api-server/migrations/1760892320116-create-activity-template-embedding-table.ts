import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateActivityTemplateEmbeddingTable1760892320116 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "vector"');

    await queryRunner.query(`
      CREATE TABLE "activity_template_embedding" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "activity_template_id" uuid NOT NULL,
        "embedding" vector(1536) NOT NULL,
        "text_source" character varying NOT NULL,
        "metadata" jsonb,
        "model_version" character varying,
        CONSTRAINT "PK_activity_template_embedding_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_activity_template_embedding_activity_template_id" UNIQUE ("activity_template_id"),
        CONSTRAINT "FK_activity_template_embedding_activity_template_id" FOREIGN KEY ("activity_template_id")
          REFERENCES "activity_template"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_activity_template_embedding_activity_template_id"
      ON "activity_template_embedding" ("activity_template_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_activity_template_embedding_vector"
      ON "activity_template_embedding"
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_activity_template_embedding_vector"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_activity_template_embedding_activity_template_id"');
    await queryRunner.query('DROP TABLE "activity_template_embedding"');
  }
}
