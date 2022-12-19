import { MigrationInterface, QueryRunner } from 'typeorm';

export class createTableTracks1671413375981 implements MigrationInterface {
  name = 'createTableTracks1671413375981';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tracks" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
      "name" character varying, 
      "artist" character varying, 
      "description" character varying, 
      "download_url" character varying, 
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT "PK_0631b9bcf521f8fab3a15f2c37e" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "tracks"');
  }
}
