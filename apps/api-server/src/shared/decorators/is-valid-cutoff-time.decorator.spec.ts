import { validate } from 'class-validator';
import { UpdateUserSettingsDto } from '../../modules/user/dto/update-user-settings.dto';

function createTestInstance(overrides: Partial<UpdateUserSettingsDto> = {}): UpdateUserSettingsDto {
  const defaultInstance = new UpdateUserSettingsDto();
  Object.assign(defaultInstance, {
    startup_time: '06:00',
    shutdown_time: '18:00',
    break_after_minutes: 15,
    morning_activities: [],
    evening_activities: [],
    break_activities: [],
    ...overrides,
  });
  return defaultInstance;
}

describe('IsValidCutoffTime', () => {
  const invalid_cutoff_time_message =
    'Invalid cutoff time. Must satisfy the condition (cutoff < startup && cutoff < shutdown) || cutoff > shutdown.';
  it('positive: should pass when cutoff_time is earlier than both startup_time and shutdown_time', async () => {
    const instance = createTestInstance({ cutoff_time_for_non_high_priority_activities: '05:00' });

    const errors = await validate(instance);
    expect(errors.length).toBe(0);
  });

  it('positive: should pass when cutoff_time is later than shutdown_time', async () => {
    const instance = createTestInstance({ cutoff_time_for_non_high_priority_activities: '19:00' });

    const errors = await validate(instance);
    expect(errors.length).toBe(0);
  });

  it('positive: should pass when cutoff_time is missing', async () => {
    const instance = createTestInstance({ cutoff_time_for_non_high_priority_activities: undefined });

    const errors = await validate(instance);
    expect(errors.length).toBe(0);
  });

  it('negative: should fail when cutoff_time is between startup_time and shutdown_time', async () => {
    const instance = createTestInstance({ cutoff_time_for_non_high_priority_activities: '12:00' });

    const errors = await validate(instance);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isValidCutoffTime).toBe(invalid_cutoff_time_message);
  });

  it('negative: should fail when cutoff_time or other times are invalid', async () => {
    const instance = createTestInstance({ cutoff_time_for_non_high_priority_activities: 'invalid' });

    const errors = await validate(instance);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isValidCutoffTime).toBe(invalid_cutoff_time_message);
  });

  it('positive: should auto-adjust cutoff when it matches shutdown time', async () => {
    const instance = createTestInstance({
      shutdown_time: '22:00',
      cutoff_time_for_non_high_priority_activities: '22:00',
    });

    const errors = await validate(instance);
    expect(errors.length).toBe(0);
    expect(instance.cutoff_time_for_non_high_priority_activities).toBe('22:01');
  });

  it('positive: should wrap cutoff to midnight when shutdown time is 23:59', async () => {
    const instance = createTestInstance({
      shutdown_time: '23:59',
      cutoff_time_for_non_high_priority_activities: '23:59',
    });

    const errors = await validate(instance);
    expect(errors.length).toBe(0);
    expect(instance.cutoff_time_for_non_high_priority_activities).toBe('00:00');
  });
});
