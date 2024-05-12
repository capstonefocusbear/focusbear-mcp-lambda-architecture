import { MigrationInterface, QueryRunner } from 'typeorm';

export class seedTestUserDevice1670205110372 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        INSERT INTO "devices" 
            ("id", "user_id", "is_leader", "operating_system", 
            "metadata", "created_at", "updated_at") 
        VALUES
            ('092d701d-26f4-4e3b-9da0-bde03f950982', '2636a216-f363-493e-aeb8-d275a0a9016d', 
            '1', 'Windows', NULL, '2022-12-04 04:14:30.299438+00', '2022-12-04 04:14:30.299438+00')
        ON CONFLICT ("id") DO NOTHING;;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DELETE FROM "devices" WHERE id = '092d701d-26f4-4e3b-9da0-bde03f950982';
`);
  }
}
