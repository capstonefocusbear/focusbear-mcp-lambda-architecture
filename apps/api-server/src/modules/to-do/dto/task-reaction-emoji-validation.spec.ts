import { validate } from 'class-validator';
import { CreateTaskReactionDto } from './create-task-reaction.dto';
import { DeleteTaskReactionQueryDto } from './delete-task-reaction-query.dto';

describe('TaskReaction emoji validation', () => {
  const validateCreateDto = async (emoji: string) => {
    const dto = new CreateTaskReactionDto();
    dto.emoji = emoji;
    return validate(dto);
  };

  const validateDeleteDto = async (emoji: string) => {
    const dto = new DeleteTaskReactionQueryDto();
    dto.emoji = emoji;
    return validate(dto);
  };

  it('accepts a single emoji', async () => {
    const errors = await validateCreateDto('👍');

    expect(errors).toEqual([]);
  });

  it('accepts keycap emoji and rejects plain keycap source characters', async () => {
    await expect(validateCreateDto('1️⃣')).resolves.toEqual([]);
    await expect(validateCreateDto('1')).resolves.toHaveLength(1);
    await expect(validateCreateDto('#')).resolves.toHaveLength(1);
    await expect(validateCreateDto('*')).resolves.toHaveLength(1);
  });

  it('rejects multiple emojis in a single request', async () => {
    const errors = await validateCreateDto('👍👍');

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('emoji');
  });

  it('applies the same emoji validation for delete query dto', async () => {
    await expect(validateDeleteDto('👍')).resolves.toEqual([]);
    await expect(validateDeleteDto('👍👍')).resolves.toHaveLength(1);
  });
});
