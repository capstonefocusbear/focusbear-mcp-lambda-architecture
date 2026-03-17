import { MigrationInterface, QueryRunner } from 'typeorm';

export class seedTestCourses1763725436286 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const testUserId = '47b8f555-d20a-4f2a-9b42-cba89900f52f';
    const now = new Date().toISOString();

    // Seed test courses
    await queryRunner.query(`
      INSERT INTO "courses" 
        ("id", "author_id", "name", "description", "is_hidden", "deleted", "platform", "created_at", "updated_at")
      VALUES
        ('a1b2c3d4-e5f6-4789-a012-345678901234', '${testUserId}', 
         'Introduction to Focus Bear', 
         'Learn the basics of using Focus Bear to improve your productivity and focus.', 
         false, false, 'web', '${now}', '${now}'),
        ('b2c3d4e5-f6a7-4890-b123-456789012345', '${testUserId}', 
         'Advanced Productivity Techniques', 
         'Master advanced techniques for maximizing your productivity with Focus Bear.', 
         false, false, 'mac', '${now}', '${now}'),
        ('c3d4e5f6-a7b8-4901-c234-567890123456', '${testUserId}', 
         'Mobile Productivity Guide', 
         'Complete guide to using Focus Bear on mobile devices for productivity on the go.', 
         false, false, 'ios', '${now}', '${now}'),
        ('d4e5f6a7-b8c9-4012-d345-678901234567', '${testUserId}', 
         'Windows Focus Mastery', 
         'Comprehensive course for Windows users to master Focus Bear features.', 
         false, false, 'win', '${now}', '${now}'),
        ('e5f6a7b8-c9d0-4123-e456-789012345678', '${testUserId}', 
         'Android Productivity Essentials', 
         'Essential productivity tips and tricks for Android users using Focus Bear.', 
         false, false, 'android', '${now}', '${now}'),
        ('f6a7b8c9-d0e1-4234-f567-890123456789', '${testUserId}', 
         'Hidden Course Example', 
         'This is a hidden course that should not appear in public listings.', 
         true, false, 'web', '${now}', '${now}')
      ON CONFLICT ("id") DO NOTHING;
    `);

    // Seed course enrollments for test user
    await queryRunner.query(`
      INSERT INTO "course_enrolments" 
        ("id", "course_id", "user_id", "finished", "created_at", "updated_at")
      VALUES
        ('11111111-1111-4111-8111-111111111111', 
         'a1b2c3d4-e5f6-4789-a012-345678901234', 
         '${testUserId}', 
         false, '${now}', '${now}'),
        ('22222222-2222-4222-8222-222222222222', 
         'b2c3d4e5-f6a7-4890-b123-456789012345', 
         '${testUserId}', 
         true, '${now}', '${now}'),
        ('33333333-3333-4333-8333-333333333333', 
         'c3d4e5f6-a7b8-4901-c234-567890123456', 
         '${testUserId}', 
         false, '${now}', '${now}')
      ON CONFLICT ("id") DO NOTHING;
    `);

    // Seed course ratings for test user
    await queryRunner.query(`
      INSERT INTO "course_ratings" 
        ("id", "user_id", "course_id", "rating", "review", "created_at", "updated_at")
      VALUES
        ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 
         '${testUserId}', 
         'a1b2c3d4-e5f6-4789-a012-345678901234', 
         5, 
         'Excellent course! Really helped me understand the basics of Focus Bear. Highly recommended for beginners.', 
         '${now}', '${now}'),
        ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 
         '${testUserId}', 
         'b2c3d4e5-f6a7-4890-b123-456789012345', 
         4, 
         'Great advanced techniques. The course covers a lot of ground and provides practical tips.', 
         '${now}', '${now}'),
        ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 
         '${testUserId}', 
         'c3d4e5f6-a7b8-4901-c234-567890123456', 
         5, 
         'Perfect for mobile users! Clear instructions and helpful examples.', 
         '${now}', '${now}')
      ON CONFLICT ("id") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const testUserId = '2636a216-f363-493e-aeb8-d275a0a9016d';

    // Delete course ratings
    await queryRunner.query(`
      DELETE FROM "course_ratings" 
      WHERE "user_id" = '${testUserId}';
    `);

    // Delete course enrollments
    await queryRunner.query(`
      DELETE FROM "course_enrolments" 
      WHERE "user_id" = '${testUserId}';
    `);

    // Delete courses created by test user
    await queryRunner.query(`
      DELETE FROM "courses" 
      WHERE "author_id" = '${testUserId}';
    `);
  }
}
