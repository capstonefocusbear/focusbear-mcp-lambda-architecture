import { MigrationInterface, QueryRunner } from 'typeorm';

export class seedTestUserFocusMode1670206816596 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    INSERT INTO "focus_modes" 
        ("id", "user_id", "name", "allowed_apps", 
        "allowed_urls", "created_at", "updated_at", "metadata", 
        "deleted_at") 
    VALUES
        ('6a85825f-2b49-46c5-b838-dd1bafa5f6ed', '05809552-fbff-4dea-aca0-93f5d707ac22', 
        'hct4+kWI8q3+7pVbbhcUGfXzqCNimvhPB6x5BMVbpdg=', '{"encrypted": "lX/DEZPKovbjRnWxaxkDDjP1xDnMUoyHbxsuQr/oI+0hBvM3oz1hn1icS50YC0U+"}', 
        '{"encrypted": "9TAM0T+CRYNUHU7Kk2SziUXijmyBWv+HX1dTh7cmkWbZuMydre+N1FFIqiDJmlW1"}', '2022-12-04 03:58:00.553832+00', 
        '2022-12-04 03:58:00.553832+00', NULL, NULL)
    ON CONFLICT ("id") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DELETE FROM "focus_modes" WHERE "user_id" = '05809552-fbff-4dea-aca0-93f5d707ac22';
    `);
  }
}
