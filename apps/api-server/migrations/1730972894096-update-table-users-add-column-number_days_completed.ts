import { MigrationInterface, QueryRunner, TableColumn } from "typeorm"

export class UpdateTableUsersAddColumnNumberDaysCompleted1730972894096 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'users',
            new TableColumn({
              name: 'number_days_completed',
              type: 'float',
              default: 0,
            }),
          );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('users', 'number_days_completed');
    }

}
