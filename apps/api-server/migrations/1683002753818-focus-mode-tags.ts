import { MigrationInterface, QueryRunner } from 'typeorm';

export class FocusModeTags1683002753818 implements MigrationInterface {
  name = 'FocusModeTags1683002753818';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "focus_mode_tags" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "user_id" uuid NOT NULL, "text" character varying, CONSTRAINT "PK_0441e5316f08f0f63eafb21f59d" PRIMARY KEY ("id"))',
    );
    await queryRunner.query('CREATE INDEX "IDX_5c3737d34b20e8d1d93cd983dc" ON "focus_mode_tags" ("user_id") ');
    await queryRunner.query(
      'CREATE TABLE "focus_mode_templates_tags_focus_mode_tags" ("focusModeTemplatesId" uuid NOT NULL, "focusModeTagsId" uuid NOT NULL, CONSTRAINT "PK_0c1f57451f01efd2041fe270777" PRIMARY KEY ("focusModeTemplatesId", "focusModeTagsId"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_48fac5d4241dac934c86ea2323" ON "focus_mode_templates_tags_focus_mode_tags" ("focusModeTemplatesId") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_21566dca5a4a08de802013cebc" ON "focus_mode_templates_tags_focus_mode_tags" ("focusModeTagsId") ',
    );
    await queryRunner.query(
      'CREATE TABLE "completed_focus_blocks_tags_focus_mode_tags" ("completedFocusBlocksId" uuid NOT NULL, "focusModeTagsId" uuid NOT NULL, CONSTRAINT "PK_1a3879d225dbc552b4da3e69065" PRIMARY KEY ("completedFocusBlocksId", "focusModeTagsId"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_f75d926871ef6c14c70d59a76e" ON "completed_focus_blocks_tags_focus_mode_tags" ("completedFocusBlocksId") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_c71c30188a95ccf3715dd4fcd0" ON "completed_focus_blocks_tags_focus_mode_tags" ("focusModeTagsId") ',
    );
    await queryRunner.query(
      'CREATE TABLE "focus_modes_tags_focus_mode_tags" ("focusModesId" uuid NOT NULL, "focusModeTagsId" uuid NOT NULL, CONSTRAINT "PK_91974ce816da0dab86db8201240" PRIMARY KEY ("focusModesId", "focusModeTagsId"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_9a78c955c1bfdc7ea9591eeae6" ON "focus_modes_tags_focus_mode_tags" ("focusModesId") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_522931aa84f8007d8299879a50" ON "focus_modes_tags_focus_mode_tags" ("focusModeTagsId") ',
    );
    await queryRunner.query(
      'ALTER TABLE "focus_mode_tags" ADD CONSTRAINT "FK_5c3737d34b20e8d1d93cd983dc3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "focus_mode_templates_tags_focus_mode_tags" ADD CONSTRAINT "FK_48fac5d4241dac934c86ea23235" FOREIGN KEY ("focusModeTemplatesId") REFERENCES "focus_mode_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "focus_mode_templates_tags_focus_mode_tags" ADD CONSTRAINT "FK_21566dca5a4a08de802013cebc2" FOREIGN KEY ("focusModeTagsId") REFERENCES "focus_mode_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_focus_blocks_tags_focus_mode_tags" ADD CONSTRAINT "FK_f75d926871ef6c14c70d59a76ea" FOREIGN KEY ("completedFocusBlocksId") REFERENCES "completed_focus_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_focus_blocks_tags_focus_mode_tags" ADD CONSTRAINT "FK_c71c30188a95ccf3715dd4fcd02" FOREIGN KEY ("focusModeTagsId") REFERENCES "focus_mode_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "focus_modes_tags_focus_mode_tags" ADD CONSTRAINT "FK_9a78c955c1bfdc7ea9591eeae6b" FOREIGN KEY ("focusModesId") REFERENCES "focus_modes"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "focus_modes_tags_focus_mode_tags" ADD CONSTRAINT "FK_522931aa84f8007d8299879a501" FOREIGN KEY ("focusModeTagsId") REFERENCES "focus_mode_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "focus_modes_tags_focus_mode_tags" DROP CONSTRAINT "FK_522931aa84f8007d8299879a501"',
    );
    await queryRunner.query(
      'ALTER TABLE "focus_modes_tags_focus_mode_tags" DROP CONSTRAINT "FK_9a78c955c1bfdc7ea9591eeae6b"',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_focus_blocks_tags_focus_mode_tags" DROP CONSTRAINT "FK_c71c30188a95ccf3715dd4fcd02"',
    );
    await queryRunner.query(
      'ALTER TABLE "completed_focus_blocks_tags_focus_mode_tags" DROP CONSTRAINT "FK_f75d926871ef6c14c70d59a76ea"',
    );
    await queryRunner.query(
      'ALTER TABLE "focus_mode_templates_tags_focus_mode_tags" DROP CONSTRAINT "FK_21566dca5a4a08de802013cebc2"',
    );
    await queryRunner.query(
      'ALTER TABLE "focus_mode_templates_tags_focus_mode_tags" DROP CONSTRAINT "FK_48fac5d4241dac934c86ea23235"',
    );
    await queryRunner.query('ALTER TABLE "focus_mode_tags" DROP CONSTRAINT "FK_5c3737d34b20e8d1d93cd983dc3"');
    await queryRunner.query('DROP INDEX "public"."IDX_522931aa84f8007d8299879a50"');
    await queryRunner.query('DROP INDEX "public"."IDX_9a78c955c1bfdc7ea9591eeae6"');
    await queryRunner.query('DROP TABLE "focus_modes_tags_focus_mode_tags"');
    await queryRunner.query('DROP INDEX "public"."IDX_c71c30188a95ccf3715dd4fcd0"');
    await queryRunner.query('DROP INDEX "public"."IDX_f75d926871ef6c14c70d59a76e"');
    await queryRunner.query('DROP TABLE "completed_focus_blocks_tags_focus_mode_tags"');
    await queryRunner.query('DROP INDEX "public"."IDX_21566dca5a4a08de802013cebc"');
    await queryRunner.query('DROP INDEX "public"."IDX_48fac5d4241dac934c86ea2323"');
    await queryRunner.query('DROP TABLE "focus_mode_templates_tags_focus_mode_tags"');
    await queryRunner.query('DROP INDEX "public"."IDX_5c3737d34b20e8d1d93cd983dc"');
    await queryRunner.query('DROP TABLE "focus_mode_tags"');
  }
}
