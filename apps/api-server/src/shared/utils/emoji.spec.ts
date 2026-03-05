import { normalizeSingleEmoji, SINGLE_EMOJI_REGEX } from './emoji';

describe('emoji utils', () => {
  describe('SINGLE_EMOJI_REGEX', () => {
    it('accepts valid single emoji forms', () => {
      expect(SINGLE_EMOJI_REGEX.test('🏃')).toBe(true);
      expect(SINGLE_EMOJI_REGEX.test('🧘‍♂️')).toBe(true);
      expect(SINGLE_EMOJI_REGEX.test('🇺🇸')).toBe(true);
      expect(SINGLE_EMOJI_REGEX.test('3️⃣')).toBe(true);
    });

    it('rejects non-emoji and mixed strings', () => {
      expect(SINGLE_EMOJI_REGEX.test('3')).toBe(false);
      expect(SINGLE_EMOJI_REGEX.test('#hello')).toBe(false);
      expect(SINGLE_EMOJI_REGEX.test('🏃 run')).toBe(false);
      expect(SINGLE_EMOJI_REGEX.test('')).toBe(false);
    });
  });

  describe('normalizeSingleEmoji', () => {
    it('returns a normalized emoji when valid', () => {
      expect(normalizeSingleEmoji(' 🧘‍♂️ ')).toBe('🧘‍♂️');
      expect(normalizeSingleEmoji('3️⃣')).toBe('3️⃣');
    });

    it('returns undefined for invalid values', () => {
      expect(normalizeSingleEmoji(undefined)).toBeUndefined();
      expect(normalizeSingleEmoji(null)).toBeUndefined();
      expect(normalizeSingleEmoji(3)).toBeUndefined();
      expect(normalizeSingleEmoji('3')).toBeUndefined();
      expect(normalizeSingleEmoji('#hello')).toBeUndefined();
      expect(normalizeSingleEmoji('🏃 run')).toBeUndefined();
    });
  });
});
