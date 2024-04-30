import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class UpdateTableAnswerAddColumnMetadata1714486617893 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'answer',
      new TableColumn({
        name: 'survey_metadata_id',
        type: 'UUID',
      }),
    );
    await queryRunner.createIndex(
      'answer',
      new TableIndex({
        name: 'IDX_h0Ca9fw0tqEPYg0UDrBYfNNeWy',
        columnNames: ['survey_metadata_id'],
      }),
    );
    await queryRunner.createForeignKey(
      'answer',
      new TableForeignKey({
        name: 'answer_survey_metadata_id_fkey',
        columnNames: ['survey_metadata_id'],
        referencedTableName: 'survey-metadata',
        referencedColumnNames: ['id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('answer', 'IDX_h0Ca9fw0tqEPYg0UDrBYfNNeWy');
    await queryRunner.dropForeignKey('answer', 'answer_survey_metadata_id_fkey');
    await queryRunner.dropColumn('answer', 'survey_metadata_id');
  }
}
