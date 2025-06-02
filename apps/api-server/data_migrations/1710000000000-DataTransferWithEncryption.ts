/* eslint-disable */
import { MigrationInterface, QueryRunner, DataSource } from 'typeorm';
import { User } from '../src/modules/user/entities/user.entity';
import { Activity } from '../src/modules/activity/entities/activity.entity';
import { ActivitySequence } from '../src/modules/activity/entities/activity-sequence.entity';
import { CompletedActivity } from '../src/modules/activity/entities/completed-activity.entity';
import { CompletedActivitySequence } from '../src/modules/activity/entities/completed-activity-sequence.entity';
import { Device } from '../src/modules/device/entities/device.entity';
import { CompletedFocusBlock } from '../src/modules/focus-mode/entities/completed-focus-block.entity';
import { FocusMode } from '../src/modules/focus-mode/entities/focus-mode.entity';
import { Team } from '../src/modules/team/entities/team.entity';
import { HabitPack } from '../src/modules/habit-pack/entity/habit-pack.entity';
import { InstalledPack } from '../src/modules/habit-pack/entity/installed-pack.entity';
import { ActivityTemplate } from '../src/modules/activity-template/entity/activity-template.entity';
import { Notification } from '../src/modules/notification/entities/notification.entity';
import { VideoMetadata } from '../src/modules/video-metadata/entities/video-metadata.entity';
import { Track } from '../src/modules/tracks/entities/track.entity';
import { FocusModeTemplate } from '../src/modules/focus-mode-template/entities/focus-mode-template.entity';
import { InstalledFocusModeTemplate } from '../src/modules/focus-mode-template/entities/installed-focus-mode_templates.entity';
import { Course } from '../src/modules/course/entities/course.entity';
import { CourseEnrolment } from '../src/modules/course/entities/course-enrolment.entity';
import { CourseRating } from '../src/modules/course/entities/course-rating.entity';
import { Lesson } from '../src/modules/lesson/entities/lesson.entity';
import { LessonCompletion } from '../src/modules/lesson/entities/lesson-completion.entity';
import { UserConsent } from '../src/modules/user/entities/user-consent.entity';
import { DailyStats } from '../src/modules/user/entities/user-daily-stats.entity';
import { AdminAccessRequest } from '../src/modules/user/entities/admin-access-requests.entity';
import { LogQuantityQuestion } from '../src/modules/activity/entities/log-quantity-questions';
import { LogQuantityAnswer } from '../src/modules/activity/entities/log-quantity-answers';
import { FocusModeTag } from '../src/modules/focus-mode/entities/focus-mode-tags';
import { SavedWebsite } from '../src/modules/saved-website/entities/saved-website.entity';
import { ToDo } from '../src/modules/to-do/entities/to-do.entity';
import { ImpactEvent } from '../src/modules/events/entities/impact-event.entity';
import { UserFeedback } from '../src/modules/user/entities/user-feedback.entity';
import { TaskTimeLog } from '../src/modules/to-do/entities/tasks-time-logs.entity';
import { PlatformIntegration } from '../src/modules/platform-integrations/entities/platform-integration.entity';
import { SyncedProject } from '../src/modules/to-do/entities/synced-project.entity';
import { CalendarExcludedKeyword } from '../src/modules/calendar/entities/calendar-excluded-keywords.entity';
import { Calendar } from '../src/modules/calendar/entities/calendar.entity';
import { TeamToMember } from '../src/modules/team/entities/team-to-member.entity';
import { TeamToAdmin } from '../src/modules/team/entities/team-to-admin.entity';
import { TrackEvent } from '../src/modules/events/entities/track-event.entity';
import { Tutorial } from '../src/modules/activity/entities/tutorial.entity';
import { Feedback } from '../../../libs/stripe/src/entities/feedback.entity';
import { Survey } from '../src/modules/survey/entities/survey.entity';
import { SurveyAnswer } from '../src/modules/survey/entities/survey-answer.entity';
import { SurveyAnswerMetadata } from '../src/modules/survey/entities/survey-answer-metadata.entity';
import { ActivityTemplateTag } from '../src/modules/activity-template/entity/activity-template-tag.entity';
import { CustomRoutine } from '../src/modules/user/entities/custom-routine';

interface EntityConfig {
  entity: any;
  order: number;
  encryptedFields?: {
    field: string;
    salt?: string;
    type?: 'json' | 'string';
  }[];
}

export class DataTransferWithEncryption1710000000000 implements MigrationInterface {
  private sourceDataSource: DataSource;
  private targetDataSource: DataSource;

  private readonly entityConfigs: EntityConfig[] = [
    // Level 1: Independent entities
    {
      entity: User,
      order: 1,
      encryptedFields: [
        { field: 'local_device_settings', salt: 'local_device_settings', type: 'json' },
        { field: 'metadata', salt: 'metadata', type: 'json' },
        { field: 'long_term_goals', salt: 'long_term_goals', type: 'json' },
        { field: 'revenue_cat_data', salt: 'revenue_cat_data', type: 'json' },
      ],
    },
    {
      entity: ActivityTemplate,
      order: 2,
      encryptedFields: [
        { field: 'activity_data', salt: 'activity_data', type: 'json' },
        { field: 'check_list', salt: 'check_list', type: 'json' },
      ],
    },
    {
      entity: FocusModeTemplate,
      order: 3,
      encryptedFields: [
        { field: 'allowed_apps', salt: 'allowed_apps', type: 'json' },
        { field: 'allowed_urls', salt: 'allowed_urls', type: 'json' },
      ],
    },
    {
      entity: HabitPack,
      order: 4,
    },
    { entity: Track, order: 5 },
    { entity: VideoMetadata, order: 6 },
    { entity: Course, order: 7 },
    { entity: Survey, order: 8 },
    { entity: Tutorial, order: 9 },
    { entity: Feedback, order: 10 },

    // Level 2: First level dependencies
    {
      entity: Team,
      order: 11,
      encryptedFields: [{ field: 'stripe_data', salt: 'stripe_data', type: 'json' }],
    },
    {
      entity: Device,
      order: 12,
      encryptedFields: [{ field: 'metadata', salt: 'metadata', type: 'json' }],
    },
    {
      entity: PlatformIntegration,
      order: 13,
      encryptedFields: [{ field: 'data', salt: 'data', type: 'json' }],
    },
    {
      entity: Activity,
      order: 14,
      encryptedFields: [
        { field: 'activity_data', salt: 'activity_data', type: 'json' },
        { field: 'check_list', salt: 'check_list', type: 'json' },
      ],
    },
    {
      entity: FocusMode,
      order: 15,
      encryptedFields: [
        { field: 'name', salt: 'name', type: 'string' },
        { field: 'allowed_apps', salt: 'allowed_apps', type: 'json' },
        { field: 'allowed_urls', salt: 'allowed_urls', type: 'json' },
        { field: 'metadata', salt: 'metadata', type: 'json' },
      ],
    },
    {
      entity: CustomRoutine,
      order: 16,
      encryptedFields: [
        { field: 'name', salt: 'name', type: 'string' },
        { field: 'days_of_week', salt: 'days_of_week', type: 'json' },
      ],
    },
    {
      entity: Notification,
      order: 17,
      encryptedFields: [{ field: 'external_metadata', salt: 'external_metadata', type: 'json' }],
    },
    {
      entity: SavedWebsite,
      order: 18,
      encryptedFields: [
        { field: 'url', salt: 'url', type: 'string' },
        { field: 'title', salt: 'title', type: 'string' },
        { field: 'note', salt: 'note', type: 'string' },
      ],
    },
    {
      entity: TaskTimeLog,
      order: 19,
      encryptedFields: [{ field: 'note', salt: 'note', type: 'string' }],
    },
    { entity: SyncedProject, order: 20 },
    { entity: CalendarExcludedKeyword, order: 21 },
    { entity: UserConsent, order: 22 },
    { entity: UserFeedback, order: 23 },
    { entity: ImpactEvent, order: 24 },
    { entity: AdminAccessRequest, order: 25 },
    { entity: Calendar, order: 26 },
    { entity: TrackEvent, order: 27 },
    { entity: InstalledPack, order: 28 },
    { entity: InstalledFocusModeTemplate, order: 29 },
    { entity: ActivityTemplateTag, order: 30 },
    { entity: FocusModeTag, order: 31 },

    // Level 3: Second level dependencies
    {
      entity: ActivitySequence,
      order: 32,
      encryptedFields: [{ field: 'activity_ids', salt: 'activity_ids', type: 'json' }],
    },
    { entity: LogQuantityQuestion, order: 33 },
    {
      entity: TeamToMember,
      order: 34,
      encryptedFields: [
        { field: 'first_name', salt: 'first_name', type: 'string' },
        { field: 'last_name', salt: 'last_name', type: 'string' },
      ],
    },
    {
      entity: TeamToAdmin,
      order: 35,
      encryptedFields: [
        { field: 'first_name', salt: 'first_name', type: 'string' },
        { field: 'last_name', salt: 'last_name', type: 'string' },
      ],
    },
    {
      entity: ToDo,
      order: 36,
      encryptedFields: [
        { field: 'title', salt: 'title', type: 'string' },
        { field: 'details', salt: 'details', type: 'string' },
        { field: 'objective', salt: 'objective', type: 'string' },
      ],
    },
    { entity: CourseEnrolment, order: 37 },
    { entity: Lesson, order: 38 },
    { entity: LessonCompletion, order: 39 },
    { entity: CourseRating, order: 40 },
    {
      entity: SurveyAnswer,
      order: 41,
      encryptedFields: [{ field: 'reply', salt: 'reply', type: 'string' }],
    },
    { entity: SurveyAnswerMetadata, order: 42 },

    // Level 4: Third level dependencies
    {
      entity: CompletedActivity,
      order: 43,
      encryptedFields: [{ field: 'activity_note', salt: 'activity_note', type: 'string' }],
    },
    {
      entity: CompletedFocusBlock,
      order: 44,
      encryptedFields: [
        { field: 'intention', salt: 'intention', type: 'string' },
        { field: 'achievements', salt: 'achievements', type: 'string' },
        { field: 'distractions', salt: 'distractions', type: 'string' },
        { field: 'metadata', salt: 'metadata', type: 'json' },
      ],
    },
    { entity: LogQuantityAnswer, order: 45 },
    { entity: CompletedActivitySequence, order: 46 },
    { entity: DailyStats, order: 47 },
  ];

  private async processEntity(config: EntityConfig): Promise<void> {
    const { entity, encryptedFields = [] } = config;

    console.log(`Processing ${entity.name}...`);

    // Get all records from source with relations
    const records = await this.sourceDataSource.getRepository(entity).find({
      order: { id: 'ASC' },
    });

    console.log(`Found ${records.length} records for ${entity.name}`);

    // Process records in batches of 100
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      // Create a new array with only the necessary properties
      const processedBatch = batch.map((record) => {
        const processedRecord = {};
        Object.keys(record).forEach((key) => {
          if (record[key] !== undefined && record[key] !== null) {
            processedRecord[key] = record[key];
          }
        });
        return processedRecord;
      });

      // Save batch to target database
      try {
        await this.targetDataSource.getRepository(entity).save(processedBatch);
        console.log(
          `Processed batch ${i / batchSize + 1} of ${Math.ceil(records.length / batchSize)} for ${entity.name}`,
        );
      } catch (error) {
        console.error(
          `Error processing batch ${i / batchSize + 1} of ${Math.ceil(records.length / batchSize)} for ${entity.name}:`,
          error,
        );
      }
    }
  }

  private async disableForeignKeys(dataSource: DataSource): Promise<void> {
    await dataSource.query(`
            DO $$ 
            DECLARE
                r RECORD;
            BEGIN
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                    EXECUTE 'ALTER TABLE ' || quote_ident(r.tablename) || ' DISABLE TRIGGER ALL';
                END LOOP;
            END $$;
        `);
    console.log('Foreign key constraints disabled');
  }

  private async enableForeignKeys(dataSource: DataSource): Promise<void> {
    await dataSource.query(`
            DO $$ 
            DECLARE
                r RECORD;
            BEGIN
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                    EXECUTE 'ALTER TABLE ' || quote_ident(r.tablename) || ' ENABLE TRIGGER ALL';
                END LOOP;
            END $$;
        `);
    console.log('Foreign key constraints enabled');
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableRows = {};
    // Initialize source and target data sources
    this.sourceDataSource = new DataSource({
      type: 'postgres',
      host: process.env.SOURCE_POSTGRES_HOST,
      port: Number(process.env.SOURCE_POSTGRES_PORT) || 5432,
      username: process.env.SOURCE_POSTGRES_USERNAME,
      password: process.env.SOURCE_POSTGRES_PASSWORD,
      database: process.env.SOURCE_POSTGRES_DB,
      entities: this.entityConfigs.map((config) => config.entity),
      synchronize: false,
      logging: false,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    this.targetDataSource = new DataSource({
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: process.env.POSTGRES_PORT ? Number(process.env.POSTGRES_PORT) : 5432,
      username: process.env.POSTGRES_USERNAME,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      entities: this.entityConfigs.map((config) => config.entity),
      synchronize: false,
      logging: false,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    await this.sourceDataSource.initialize();
    await this.targetDataSource.initialize();

    try {
      // Disable foreign key constraints on target database
      await this.disableForeignKeys(this.targetDataSource);

      // Process entities in order
      for (const config of this.entityConfigs) {
        await this.targetDataSource.transaction(async (transactionalEntityManager) => {
          await this.processEntity(config);
        });

        //check if the number of records in the target database is the same as the source database
        const sourceRecords = await this.sourceDataSource.getRepository(config.entity).find();
        const targetRecords = await this.targetDataSource.getRepository(config.entity).find();
        console.log(`${config.entity.name} records: ${sourceRecords.length} -> ${targetRecords.length}`);
        tableRows[config.entity.name] = {
          source: sourceRecords.length,
          target: targetRecords.length,
        };
      }

      // Re-enable foreign key constraints
      await this.enableForeignKeys(this.targetDataSource);
    } catch (error) {
      console.error('Migration failed:', error);
      // Make sure to re-enable constraints even if migration fails
      await this.enableForeignKeys(this.targetDataSource);
      throw error;
    } finally {
      await this.sourceDataSource.destroy();
      await this.targetDataSource.destroy();
    }
    console.log(tableRows);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Implement rollback logic if needed
    console.log('Rollback not implemented');
  }
}

// Add this at the end of the file to make it runnable as a script
if (require.main === module) {
  const migration = new DataTransferWithEncryption1710000000000();
  if (!process.env.SOURCE_POSTGRES_HOST) {
    console.error('SOURCE_POSTGRES_HOST is not set');
    process.exit(1);
  }
  console.log(`Performing data migration from ${process.env.SOURCE_POSTGRES_HOST} to ${process.env.POSTGRES_HOST}`);

  migration
    .up(null)
    .then(() => {
      console.log('Data migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Data migration failed:', error);
      process.exit(1);
    });
}
