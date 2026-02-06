import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateTaskCommentsTable1768628255000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'task_comments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'task_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'task_comments',
      new TableIndex({
        name: 'IDX_task_comments_task_id',
        columnNames: ['task_id'],
      }),
    );

    await queryRunner.createIndex(
      'task_comments',
      new TableIndex({
        name: 'IDX_task_comments_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'task_comments',
      new TableForeignKey({
        columnNames: ['task_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'to_do',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'task_comments',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('task_comments');
    if (table) {
      const { foreignKeys } = table;
      await Promise.all(foreignKeys.map((foreignKey) => queryRunner.dropForeignKey('task_comments', foreignKey)));
    }
    await queryRunner.dropTable('task_comments', true);
  }
}
