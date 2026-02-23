export const TASK_REACTION_EMOJI_REGEX =
  /^(?:\p{Regional_Indicator}{2}|[0-9#*]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*)$/u;

export const TASK_REACTION_EMOJI_VALIDATION_MESSAGE = 'emoji must be a single valid emoji character';
