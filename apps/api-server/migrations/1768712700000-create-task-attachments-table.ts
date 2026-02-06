import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateTaskAttachmentsTable1768712700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'task_attachments',
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
            name: 'file_name',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'file_key',
            type: 'varchar',
            length: '1000',
            isNullable: false,
          },
          {
            name: 'content_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'file_size',
            type: 'bigint',
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
      'task_attachments',
      new TableIndex({
        name: 'IDX_task_attachments_task_id',
        columnNames: ['task_id'],
      }),
    );

    await queryRunner.createIndex(
      'task_attachments',
      new TableIndex({
        name: 'IDX_task_attachments_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'task_attachments',
      new TableForeignKey({
        columnNames: ['task_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'to_do',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'task_attachments',
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
    const table = await queryRunner.getTable('task_attachments');
    if (table) {
      const { foreignKeys } = table;
      await Promise.all(foreignKeys.map((foreignKey) => queryRunner.dropForeignKey('task_attachments', foreignKey)));
    }
    await queryRunner.dropTable('task_attachments', true);
  }
}
