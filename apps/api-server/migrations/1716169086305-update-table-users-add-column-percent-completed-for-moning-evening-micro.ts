import { MigrationInterface, QueryRunner, TableColumn } from "typeorm"

export class UpdateTableUsersAddColumnPercentCompletedForMoningEveningMicro1716169086305 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn('users', new TableColumn({
            name: 'morning_percent_completed',
            type: 'float',
            default: 0
        }));

        await queryRunner.addColumn('users', new TableColumn({
            name: 'evening_percent_completed',
            type: 'float',
            default: 0
        }));

        await queryRunner.addColumn('users', new TableColumn({
            name: 'micro_percent_completed',
            type: 'float',
            default: 0
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('users', 'morning_percent_completed');
        await queryRunner.dropColumn('users', 'evening_percent_completed');
        await queryRunner.dropColumn('users', 'micro_percent_completed');
    }

}
