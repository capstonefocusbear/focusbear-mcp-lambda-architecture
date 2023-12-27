import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class UpdateTableLessonsAddColumnDeleted1703674848741 implements MigrationInterface {
  name = 'UpdateTableLessonsAddColumnDeleted1703674848741';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'lessons',
      new TableColumn({
        name: 'deleted',
        type: 'boolean',
        default: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('lessons', 'deleted');
  }
}
