import { validate } from 'class-validator';
import { CreateTaskCommentReactionDto } from './create-task-comment-reaction.dto';
import { DeleteTaskCommentReactionQueryDto } from './delete-task-comment-reaction-query.dto';

describe('TaskCommentReaction emoji validation', () => {
  const validateCreateDto = async (emoji: string) => {
    const dto = new CreateTaskCommentReactionDto();
    dto.emoji = emoji;
    return validate(dto);
  };

  const validateDeleteDto = async (emoji: string) => {
    const dto = new DeleteTaskCommentReactionQueryDto();
    dto.emoji = emoji;
    return validate(dto);
  };

  it('accepts a single emoji, flag emoji, and emoji with skin tone modifier', async () => {
    await expect(validateCreateDto('👍')).resolves.toEqual([]);
    await expect(validateCreateDto('🇺🇸')).resolves.toEqual([]);
    await expect(validateCreateDto('👍🏽')).resolves.toEqual([]);
  });

  it('rejects multiple emojis in a single request', async () => {
    const errors = await validateCreateDto('👍👍');

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('emoji');
  });

  it('applies the same emoji validation for delete query dto', async () => {
    await expect(validateDeleteDto('🇺🇸')).resolves.toEqual([]);
    await expect(validateDeleteDto('👍👍')).resolves.toHaveLength(1);
  });
});
