import { MigrationInterface, QueryRunner } from 'typeorm';

// Note: migrationsTransactionMode is already 'none' in typeorm.config.ts,
// so CONCURRENTLY operations are allowed

export class SwitchToHnswIndex1769692439138 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create new HNSW index with temporary name (table stays indexed during build)
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY "IDX_activity_template_embedding_vector_hnsw"
      ON "activity_template_embedding"
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)
    `);

    // 2. Drop old IVFFlat index (CONCURRENTLY to avoid write locks)
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "IDX_activity_template_embedding_vector"
    `);

    // 3. Rename new index to canonical name
    await queryRunner.query(`
      ALTER INDEX "IDX_activity_template_embedding_vector_hnsw"
      RENAME TO "IDX_activity_template_embedding_vector"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Create IVFFlat index with temporary name
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY "IDX_activity_template_embedding_vector_ivfflat"
      ON "activity_template_embedding"
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);

    // 2. Drop HNSW index
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "IDX_activity_template_embedding_vector"
    `);

    // 3. Rename to canonical name
    await queryRunner.query(`
      ALTER INDEX "IDX_activity_template_embedding_vector_ivfflat"
      RENAME TO "IDX_activity_template_embedding_vector"
    `);
  }
}
