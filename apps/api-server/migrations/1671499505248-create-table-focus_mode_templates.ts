import { MigrationInterface, QueryRunner } from 'typeorm';

export class createTableFocusModeTemplates1671499505248 implements MigrationInterface {
  name = 'createTableFocusModeTemplates1671499505248';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "focus_mode_templates" 
      ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),  
      "user_id" uuid NOT NULL, 
      "creator_name" character varying(255), 
      "name" character varying(255), 
      "allowed_apps" jsonb, 
      "allowed_urls" jsonb, 
      "description" character varying(2500), 
      "description_video_url" character varying, 
      "welcome_message" character varying(2500), 
      "welcome_video_url" character varying, 
      "marketplace_approval_status" boolean DEFAULT false, 
      "marketplace_request" "marketplace_request" DEFAULT 'unrequested', 
      "is_featured" boolean DEFAULT false, 
      "featured_for_onboarding" boolean DEFAULT false, 
      "language" character varying, 
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "deleted_at" TIMESTAMPTZ, 
      CONSTRAINT "PK_2bfba1dd33229f1827c461bc741" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "focus_mode_templates" 
      ADD CONSTRAINT "FK_219ca4ea35a2fb153fefd0ce27a" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "focus_mode_templates" DROP CONSTRAINT "FK_219ca4ea35a2fb153fefd0ce27a"');
    await queryRunner.query('DROP TABLE "focus_mode_templates"');
  }
}
