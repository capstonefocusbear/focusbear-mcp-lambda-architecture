import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class UpdateTableTutorialsAddCourseIdRemoveColumnName1710246935667 implements MigrationInterface {
  name = 'UpdateTableTutorialsAddCourseIdRemoveColumnName1710246935667';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('tutorials', 'name');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'tutorials',
      new TableColumn({
        name: 'name',
        type: 'varchar',
        length: '1000',
      }),
    );
  }
}
