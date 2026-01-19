import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { FocusMode } from '../modules/focus-mode/entities/focus-mode.entity';
import { FocusModeTag } from '../modules/focus-mode/entities/focus-mode-tags';
import { CompletedFocusBlock } from '../modules/focus-mode/entities/completed-focus-block.entity';
import { ONE_HOUR_MILLISECONDS, ONE_DAY_MILLISECONDS } from '../shared/utils/constants';
import { TEST_USER_ID } from './seeding-constant';

export class CompletedFocusBlocksSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<void> {
    const focusModeFactory = factoryManager.get(FocusMode);
    const focusModeTagFactory = factoryManager.get(FocusModeTag);
    const completedFocusBlockFactory = factoryManager.get(CompletedFocusBlock);
    const completedFocusBlockRepository = dataSource.getRepository(CompletedFocusBlock);

    // Create focus modes for test user
    const focusMode1 = await focusModeFactory.save({
      user_id: TEST_USER_ID,
      name: 'Deep Work',
    });

    const focusMode2 = await focusModeFactory.save({
      user_id: TEST_USER_ID,
      name: 'Creative Writing',
    });

    const focusMode3 = await focusModeFactory.save({
      user_id: TEST_USER_ID,
      name: 'Learning',
    });

    // Create focus mode tags for test user
    const tag1 = await focusModeTagFactory.save({
      user_id: TEST_USER_ID,
      text: 'Build healthy habits',
    });

    const tag2 = await focusModeTagFactory.save({
      user_id: TEST_USER_ID,
      text: 'Stay focused at work',
    });

    const tag3 = await focusModeTagFactory.save({
      user_id: TEST_USER_ID,
      text: 'Sleep better',
    });

    // Create completed focus blocks with various scenarios
    const now = new Date();

    // 1. Recent blocks (within last 24 hours) - for default query testing
    const oneHourAgo = new Date(now.getTime() - 1 * ONE_HOUR_MILLISECONDS);
    const twoHoursAgo = new Date(now.getTime() - 2 * ONE_HOUR_MILLISECONDS);
    const threeHoursAgo = new Date(now.getTime() - 3 * ONE_HOUR_MILLISECONDS);

    const block1 = await completedFocusBlockFactory.save({
      user_id: TEST_USER_ID,
      focus_mode_id: focusMode1.id,
      start_time: threeHoursAgo,
      finish_time: twoHoursAgo,
      focus_duration_seconds: 3600,
      achievements: 'Completed all tasks',
      distractions: 'None',
      tags: [tag1, tag2],
      metadata: {
        focus_alignment_score: 9,
        tab_count: 5,
        average_tab_count: 4.2,
        average_tab_duration: 120,
      },
    });
    await completedFocusBlockRepository.save(block1);

    const block2 = await completedFocusBlockFactory.save({
      user_id: TEST_USER_ID,
      focus_mode_id: focusMode2.id,
      start_time: twoHoursAgo,
      finish_time: oneHourAgo,
      focus_duration_seconds: 3600,
      achievements: 'Wrote 1000 words',
      distractions: 'Phone notification',
      tags: [tag1],
      metadata: {
        focus_alignment_score: 8,
        tab_count: 7,
        average_tab_count: 5.5,
        average_tab_duration: 95,
      },
    });
    await completedFocusBlockRepository.save(block2);

    const block3 = await completedFocusBlockFactory.save({
      user_id: TEST_USER_ID,
      focus_mode_id: focusMode1.id,
      start_time: oneHourAgo,
      finish_time: now,
      focus_duration_seconds: 3600,
      achievements: 'Fixed bugs',
      distractions: '',
      tags: [tag2, tag3],
      metadata: {
        focus_alignment_score: 10,
        tab_count: 3,
        average_tab_count: 3.1,
        average_tab_duration: 150,
      },
    });
    await completedFocusBlockRepository.save(block3);

    // 2. Older blocks (outside last 24 hours) - for time range testing
    const twoDaysAgo = new Date(now.getTime() - 2 * ONE_DAY_MILLISECONDS);
    const threeDaysAgo = new Date(now.getTime() - 3 * ONE_DAY_MILLISECONDS);
    const fourDaysAgo = new Date(now.getTime() - 4 * ONE_DAY_MILLISECONDS);

    const block4 = await completedFocusBlockFactory.save({
      user_id: TEST_USER_ID,
      focus_mode_id: focusMode3.id,
      start_time: fourDaysAgo,
      finish_time: threeDaysAgo,
      focus_duration_seconds: 1800,
      achievements: 'Learned new concepts',
      distractions: 'Social media',
      tags: [tag3],
      metadata: {
        focus_alignment_score: 7,
        tab_count: 12,
        average_tab_count: 8.3,
        average_tab_duration: 75,
      },
    });
    await completedFocusBlockRepository.save(block4);

    const block5 = await completedFocusBlockFactory.save({
      user_id: TEST_USER_ID,
      focus_mode_id: focusMode1.id,
      start_time: threeDaysAgo,
      finish_time: twoDaysAgo,
      focus_duration_seconds: 2700,
      achievements: 'Code review completed',
      distractions: '',
      tags: [tag1, tag2, tag3],
      metadata: {
        focus_alignment_score: 9,
        tab_count: 5,
        average_tab_count: 4.2,
        average_tab_duration: 120,
      },
    });
    await completedFocusBlockRepository.save(block5);

    // 3. Blocks without tags - for testing tag filtering
    const block6 = await completedFocusBlockFactory.save({
      user_id: TEST_USER_ID,
      focus_mode_id: focusMode2.id,
      start_time: new Date(now.getTime() - 5 * ONE_HOUR_MILLISECONDS),
      finish_time: new Date(now.getTime() - 4 * ONE_HOUR_MILLISECONDS),
      focus_duration_seconds: 3600,
      achievements: 'Drafted outline',
      distractions: '',
      tags: [],
      metadata: {
        focus_alignment_score: 6,
        tab_count: 15,
        average_tab_count: 9.8,
        average_tab_duration: 60,
      },
    });
    await completedFocusBlockRepository.save(block6);

    // 4. Blocks with different focus modes - for focus_mode_id filtering
    const block7 = await completedFocusBlockFactory.save({
      user_id: TEST_USER_ID,
      focus_mode_id: focusMode3.id,
      start_time: new Date(now.getTime() - 6 * ONE_HOUR_MILLISECONDS),
      finish_time: new Date(now.getTime() - 5 * ONE_HOUR_MILLISECONDS),
      focus_duration_seconds: 2400,
      achievements: 'Completed course module',
      distractions: 'Email check',
      tags: [tag1],
      metadata: {
        focus_alignment_score: 8,
        tab_count: 7,
        average_tab_count: 5.5,
        average_tab_duration: 95,
      },
    });
    await completedFocusBlockRepository.save(block7);

    // 5. More blocks for comprehensive testing
    const block8 = await completedFocusBlockFactory.save({
      user_id: TEST_USER_ID,
      focus_mode_id: focusMode1.id,
      start_time: new Date(now.getTime() - 8 * ONE_HOUR_MILLISECONDS),
      finish_time: new Date(now.getTime() - 7 * ONE_HOUR_MILLISECONDS),
      focus_duration_seconds: 1800,
      achievements: 'Refactored code',
      distractions: 'Team chat',
      tags: [tag2],
      metadata: {
        focus_alignment_score: 7,
        tab_count: 12,
        average_tab_count: 8.3,
        average_tab_duration: 75,
      },
    });
    await completedFocusBlockRepository.save(block8);

    const block9 = await completedFocusBlockFactory.save({
      user_id: TEST_USER_ID,
      focus_mode_id: focusMode2.id,
      start_time: new Date(now.getTime() - 10 * ONE_HOUR_MILLISECONDS),
      finish_time: new Date(now.getTime() - 9 * ONE_HOUR_MILLISECONDS),
      focus_duration_seconds: 3600,
      achievements: 'Finished chapter',
      distractions: '',
      tags: [tag1, tag3],
      metadata: {
        focus_alignment_score: 9,
        tab_count: 5,
        average_tab_count: 4.2,
        average_tab_duration: 120,
      },
    });
    await completedFocusBlockRepository.save(block9);
  }
}
