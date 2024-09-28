import { MigrationInterface, QueryRunner, TableColumn } from "typeorm"

export class UpdateUserTableAddColumnMorningEveningMicroPercentNumberDayOfStatsCompleted1717547798766 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumns("users", [
            new TableColumn({
                name: 'morning_percent_number_day_of_stats_completed',
                type: 'decimal',
                default: 0
            }),
            new TableColumn({
                name: 'evening_percent_number_day_of_stats_completed',
                type: 'decimal',
                default: 0
            }),
            new TableColumn({
                name: 'micro_percent_number_day_of_stats_completed',
                type: 'decimal',
                default: 0
            }),
            new TableColumn({
                name: 'num_days_of_stats',
                type: 'float',
                default: 0
            })
        ]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumns('users', [
            'morning_percent_number_day_of_stats_completed',
            'evening_percent_number_day_of_stats_completed',
            'micro_percent_number_day_of_stats_completed',
            'num_days_of_stats'
        ]);
    }

}
