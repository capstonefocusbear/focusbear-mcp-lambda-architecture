import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class UpdateTutorialsAddColumnUserId1709122323451 implements MigrationInterface {
  name = 'UpdateTutorialsAddColumnUserId1709122323451';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'tutorials',
      new TableColumn({
        name: 'user_id',
        type: 'UUID',
      }),
    );
    await queryRunner.createIndex(
      'tutorials',
      new TableIndex({
        name: 'IDX_hf2LeJsAdUGFZHUHerwf5xEbBt',
        columnNames: ['user_id'],
      }),
    );
    await queryRunner.createForeignKey(
      'tutorials',
      new TableForeignKey({
        name: 'tutorials_user_id_fkey',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('tutorials', 'IDX_hf2LeJsAdUGFZHUHerwf5xEbBt');
    await queryRunner.dropForeignKey('tutorials', 'tutorials_user_id_fkey');
    await queryRunner.dropColumn('tutorials', 'user_id');
  }
}
