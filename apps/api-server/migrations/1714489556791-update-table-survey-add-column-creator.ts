import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class UpdateTableSurveyAddColumnCreator1714489556791 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'survey',
      new TableColumn({
        name: 'creator',
        type: 'UUID',
      }),
    );
    await queryRunner.createIndex(
      'survey',
      new TableIndex({
        name: 'IDX_NV89jqDoq5u4d5AsYs9YDiwVfQ',
        columnNames: ['creator'],
      }),
    );
    await queryRunner.createForeignKey(
      'survey',
      new TableForeignKey({
        name: 'survey_creator_fkey',
        columnNames: ['creator'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('survey', 'IDX_NV89jqDoq5u4d5AsYs9YDiwVfQ');
    await queryRunner.dropForeignKey('survey', 'survey_creator_fkey');
    await queryRunner.dropColumn('survey', 'creator');
  }
}
