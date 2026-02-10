import { validate } from 'class-validator';
import { UpdateFocusModeDto } from './update-focus-mode.dto';

describe('UpdateFocusModeDto', () => {
  it('validates when is_ai_enabled is omitted', async () => {
    const dto = new UpdateFocusModeDto();
    const errors = await validate(dto);

    expect(errors).toEqual([]);
  });

  it('validates when is_ai_enabled is false', async () => {
    const dto = new UpdateFocusModeDto();
    dto.is_ai_enabled = false;
    const errors = await validate(dto);

    expect(errors).toEqual([]);
  });

  it('fails validation when is_ai_enabled is null', async () => {
    const dto = new UpdateFocusModeDto();
    (dto as any).is_ai_enabled = null;
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('is_ai_enabled');
    expect(errors[0].constraints?.isBoolean).toBeDefined();
  });
});
