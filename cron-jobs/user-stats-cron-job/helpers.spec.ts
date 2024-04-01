import { DummyTasksStreaksResponse } from '../../apps/api-server/test/dummies';
import { TasksStreaksResponse } from '../../apps/api-server/src/modules/user/domain/tasks-streaks-response.model';
import { UserOnboardingProgress } from '../../apps/api-server/src/modules/user/domain/user-onboarding-progress.model';
import { LEVEL_THRESHOLDS } from './constants';
import { determineUserLevel } from './helpers';

describe('determineUserLevel', () => {
  it('should return 0 if setup is not completed', () => {
    const onboardingProgress = new UserOnboardingProgress();
    onboardingProgress.has_installed_desktop_app = false;
    onboardingProgress.has_installed_mobile_app = false;
    const tasksStreaksResponse = new TasksStreaksResponse(DummyTasksStreaksResponse.SET_UP_NOT_COMPLETED);

    const level = determineUserLevel(onboardingProgress, tasksStreaksResponse);
    expect(level).toBe(0);
  });

  it('should correctly determine the user level based on streaks', () => {
    const onboardingProgress = new UserOnboardingProgress();
    onboardingProgress.has_edited_focus_mode = true;
    onboardingProgress.has_edited_settings = true;
    onboardingProgress.has_edited_always_blocked_urls = true;
    onboardingProgress.has_installed_desktop_app = true;
    const tasksStreaksResponse = new TasksStreaksResponse(DummyTasksStreaksResponse.ROUTINE_INPROGRESS);

    const level = determineUserLevel(onboardingProgress, tasksStreaksResponse);
    expect(level).toBe(2); // Expect the level to be 2 as it meets the second threshold
  });

  it('should assign level 1 with minimum streaks and complete setup', () => {
    const onboardingProgress = new UserOnboardingProgress();
    // Complete setup
    onboardingProgress.has_edited_focus_mode = true;
    onboardingProgress.has_edited_settings = true;
    onboardingProgress.has_edited_always_blocked_urls = true;
    onboardingProgress.has_installed_desktop_app = true;
    const tasksStreaksResponse = new TasksStreaksResponse(DummyTasksStreaksResponse.LEVEL_ONE);

    const level = determineUserLevel(onboardingProgress, tasksStreaksResponse);
    expect(level).toBe(1);
  });

  it('should not level up if streaks are just below the threshold for the next level', () => {
    const onboardingProgress = new UserOnboardingProgress();
    onboardingProgress.has_edited_focus_mode = true;
    onboardingProgress.has_edited_settings = true;
    onboardingProgress.has_edited_always_blocked_urls = true;
    onboardingProgress.has_installed_desktop_app = true;
    // Level 2 requires routines: 2, focus_modes: 2
    const tasksStreaksResponse = new TasksStreaksResponse(DummyTasksStreaksResponse.LEVEL_TWO);

    const level = determineUserLevel(onboardingProgress, tasksStreaksResponse);
    expect(level).toBe(1); // Should remain at level 1
  });

  it('should return level 0 if setup is incomplete, regardless of high streaks', () => {
    const onboardingProgress = new UserOnboardingProgress();
    // Incomplete setup
    onboardingProgress.has_edited_focus_mode = false;
    const tasksStreaksResponse = new TasksStreaksResponse(DummyTasksStreaksResponse.LEVEL_MAX);

    const level = determineUserLevel(onboardingProgress, tasksStreaksResponse);
    expect(level).toBe(0); // Should return level 0 due to incomplete setup
  });

  it('should cap the user level at the maximum defined level, even with excessive streaks', () => {
    const onboardingProgress = new UserOnboardingProgress();
    onboardingProgress.has_edited_focus_mode = true;
    onboardingProgress.has_edited_settings = true;
    onboardingProgress.has_edited_always_blocked_urls = true;
    onboardingProgress.has_installed_desktop_app = true;
    const tasksStreaksResponse = new TasksStreaksResponse(DummyTasksStreaksResponse.LEVEL_EXCEED_MAX);

    const maxLevel = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].level;
    const level = determineUserLevel(onboardingProgress, tasksStreaksResponse);
    expect(level).toBe(maxLevel); // Should be capped at the maximum level
  });

  it('Should return level 7 if setup complete and streaks reach seventh level threshold, but less than eight level threshold', () => {
    const onboardingProgress = new UserOnboardingProgress();
    onboardingProgress.has_edited_focus_mode = true;
    onboardingProgress.has_edited_settings = true;
    onboardingProgress.has_edited_always_blocked_urls = true;
    onboardingProgress.has_installed_desktop_app = true;
    const tasksStreaksResponse = new TasksStreaksResponse(DummyTasksStreaksResponse.LEVEL_SEVEN);

    const level = determineUserLevel(onboardingProgress, tasksStreaksResponse);
    expect(level).toBe(7);
  });
});
