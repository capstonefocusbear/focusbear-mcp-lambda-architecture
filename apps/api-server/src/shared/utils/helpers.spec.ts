import { safeDecodeURIComponent } from './helpers';

describe('safeDecodeURIComponent', () => {
  describe('Windows bug report fix - handling + as spaces', () => {
    it('should convert + signs to spaces (Windows URL encoding)', () => {
      const input = 'The+app+keeps+crashing';
      const expected = 'The app keeps crashing';
      expect(safeDecodeURIComponent(input)).toBe(expected);
    });

    it('should handle multiple + signs in a row', () => {
      const input = 'Too++many+++spaces';
      const expected = 'Too  many   spaces';
      expect(safeDecodeURIComponent(input)).toBe(expected);
    });

    it('should handle + and %20 mixed encoding', () => {
      const input = 'This+has%20mixed+spaces';
      const expected = 'This has mixed spaces';
      expect(safeDecodeURIComponent(input)).toBe(expected);
    });

    it('should handle complex feedback message with special characters', () => {
      const input = 'App+crashed+when+using+%22focus+mode%22';
      const expected = 'App crashed when using "focus mode"';
      expect(safeDecodeURIComponent(input)).toBe(expected);
    });

    it('should handle feedback with punctuation', () => {
      const input = 'Great+app%2C+but+needs+improvement%21';
      const expected = 'Great app, but needs improvement!';
      expect(safeDecodeURIComponent(input)).toBe(expected);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      expect(safeDecodeURIComponent('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(safeDecodeURIComponent(null as any)).toBe(null);
      expect(safeDecodeURIComponent(undefined as any)).toBe(undefined);
    });

    it('should handle string with no encoding', () => {
      const input = 'No encoding here';
      expect(safeDecodeURIComponent(input)).toBe('No encoding here');
    });

    it('should handle malformed URI component gracefully', () => {
      const input = 'Invalid%encoding';
      // Should return original string on error
      const result = safeDecodeURIComponent(input);
      expect(typeof result).toBe('string');
    });

    it('should handle unicode characters with +', () => {
      const input = 'Hello+%E4%B8%96%E7%95%8C';
      const expected = 'Hello 世界';
      expect(safeDecodeURIComponent(input)).toBe(expected);
    });
  });

  describe('Real-world Windows bug report examples', () => {
    it('should decode typical Windows crash report', () => {
      const input = 'The+application+crashed+while+opening+the+settings+panel.+Error+code%3A+0x0001';
      const expected = 'The application crashed while opening the settings panel. Error code: 0x0001';
      expect(safeDecodeURIComponent(input)).toBe(expected);
    });

    it('should decode Windows path in feedback', () => {
      const input = 'Cannot+save+file+to+C%3A%5CUsers%5CPublic';
      const expected = 'Cannot save file to C:\\Users\\Public';
      expect(safeDecodeURIComponent(input)).toBe(expected);
    });

    it('should handle multi-line feedback (with %0A or %0D%0A)', () => {
      const input = 'First+line%0ASecond+line%0AThird+line';
      const expected = 'First line\nSecond line\nThird line';
      expect(safeDecodeURIComponent(input)).toBe(expected);
    });
  });
});
