import { MigrationInterface, QueryRunner } from 'typeorm';

export class seedTestUserActivitySequences1670205307847 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    INSERT INTO "activity_sequences" 
        ("id", "user_id", "type", "activity_ids", "created_at", "updated_at", "total_duration_seconds", 
        "generated_sequence_activity_ids", "generated_total_duration_seconds") 
    VALUES
        ('992f79ca-380a-44fa-9166-eba70251712f', '2636a216-f363-493e-aeb8-d275a0a9016d', 'morning', 
        '{"encrypted": "YDlRAu6AXW9h8uxSbMQBaJJeYmfPjHR2EAvmHcYjzUoaw/+H3IngT7KbNCKgvq+Lh3w7ARPUVd4OUaq5xmdKMN0I+awF1e8/BHUf5Lolw6eccqlQ8rWft3AwX7dnAHggSCuLm2QdK9uNd8Vt50+DKddZzraCUED219IWW7iJ+qyAUYagy1IMWtoR4NvDF1SJ"}', 
        '2022-12-04 03:54:15.696804+00', '2022-12-04 03:54:15.696804+00', 780, NULL, NULL),
        ('4cef5086-3d11-4e22-9380-3e50a357bcb9', '2636a216-f363-493e-aeb8-d275a0a9016d', 'evening', 
        '{"encrypted": "7l3qQwfpTNfDyWNgvlNhRWmQIDhVowcscaTBn6uFBB06y5Kgdr30k+jp0NPcbydLt1R36wwfPk0vmzrRs+gA5TDNHKa4teDT/3kHnwuPa+oApl20bb/xd/RV/7RPngcttbwKI3mwkYa6CQ3XA5qSvRCH7ca/HmIhVx/i5z5OxI+PGsKOGD5drcDD/JleV6pM"}', 
        '2022-12-04 03:54:15.696804+00', '2022-12-04 03:54:15.696804+00', 900, NULL, NULL),
        ('592c2feb-2dfd-42c4-9ef2-e7166d8132ed', '2636a216-f363-493e-aeb8-d275a0a9016d', 'breaking', '{"encrypted": "B3SzQak8aSCBnd+6C0hUjCJXZ88q/3BBNtVJ1pap05Id0JWWwHH2NuzN6YqccBeiPMKUrvkB6qOG7dIcPtNdU90yQHrt/90Pk0mlwD4TSxAS/jevo21TfY8WFLefX74IdTDdrk8qKPxC3QDl6XSjWdktDoiPMotZRhFKthru/aKEJzH1bnQl+f+9Om3u2iwY"}', 
        '2022-12-04 03:54:15.696804+00', '2022-12-04 03:54:15.696804+00', 115, NULL, NULL)
    ON CONFLICT ("id") DO NOTHING;;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DELETE FROM "activity_sequences" WHERE "user_id" = '2636a216-f363-493e-aeb8-d275a0a9016d';
    `);
  }
}
