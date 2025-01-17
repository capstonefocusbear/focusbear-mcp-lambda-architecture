import { validate } from 'class-validator';
import { UpdateUserSettingsDto } from '../../modules/user/dto/update-user-settings.dto';
import { userSettingsDummy } from '../../../test/dummies';

function createTestInstance(overrides: Partial<UpdateUserSettingsDto> = {}): UpdateUserSettingsDto {
  const defaultInstance = new UpdateUserSettingsDto();
  Object.assign(defaultInstance, {
    ...userSettingsDummy,
    startup_time: '06:00',
    shutdown_time: '18:00',
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
});
