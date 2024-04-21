import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class UpdateTutorialsAddFieldActivityTemplateId1713622257940 implements MigrationInterface {
  name = 'UpdateTutorialsAddFieldActivityTemplateId1713622257940';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'tutorials',
      new TableColumn({
        name: 'activity_template_id',
        type: 'UUID',
      }),
    );
    await queryRunner.createIndex(
      'tutorials',
      new TableIndex({
        name: 'IDX_gft9h2R0KMh1Evwj6fXUumUMZo',
        columnNames: ['activity_template_id'],
      }),
    );
    await queryRunner.createForeignKey(
      'tutorials',
      new TableForeignKey({
        name: 'tutorials_activity_template_id_fkey',
        columnNames: ['activity_template_id'],
        referencedTableName: 'activity_template',
        referencedColumnNames: ['id'],
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('tutorials', 'IDX_gft9h2R0KMh1Evwj6fXUumUMZo');
    await queryRunner.dropForeignKey('tutorials', 'tutorials_activity_template_id_fkey');
    await queryRunner.dropColumn('tutorials', 'activity_template_id');
  }
}
