import { extractEmails, filterTestRecipients, isTestEmail } from './email-utils';

describe('isTestEmail', () => {
  it('should return true for internaltest@focusbear.io', () => {
    expect(isTestEmail('internaltest@focusbear.io')).toBe(true);
  });

  it('should return true for internaltest+subaddress@focusbear.io', () => {
    expect(isTestEmail('internaltest+caltest1@focusbear.io')).toBe(true);
  });

  it('should return true for internaltest+anything@focusbear.io', () => {
    expect(isTestEmail('internaltest+user123@focusbear.io')).toBe(true);
  });

  it('should return true case-insensitively', () => {
    expect(isTestEmail('InternalTest+user@focusbear.io')).toBe(true);
    expect(isTestEmail('INTERNALTEST@FOCUSBEAR.IO')).toBe(true);
  });

  it('should return false for regular user emails', () => {
    expect(isTestEmail('john@example.com')).toBe(false);
  });

  it('should return true for internaltest at a different domain (legacy includes check)', () => {
    expect(isTestEmail('internaltest@company.com')).toBe(true);
  });

  it('should return true for emails containing internaltest as substring (legacy includes check)', () => {
    expect(isTestEmail('myinternaltest@focusbear.io')).toBe(true);
  });

  it('should return false for focusbear.io emails that are not internaltest', () => {
    expect(isTestEmail('admin@focusbear.io')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isTestEmail('')).toBe(false);
  });

  it('should return false for null', () => {
    expect(isTestEmail(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isTestEmail(undefined)).toBe(false);
  });
});

describe('extractEmails', () => {
  it('should extract email from a string', () => {
    expect(extractEmails('user@example.com')).toEqual(['user@example.com']);
  });

  it('should extract email from an object with email field', () => {
    expect(extractEmails({ name: 'User', email: 'user@example.com' })).toEqual(['user@example.com']);
  });

  it('should extract emails from an array of strings', () => {
    expect(extractEmails(['a@b.com', 'c@d.com'])).toEqual(['a@b.com', 'c@d.com']);
  });

  it('should extract emails from a mixed array', () => {
    expect(extractEmails(['a@b.com', { email: 'c@d.com' }])).toEqual(['a@b.com', 'c@d.com']);
  });

  it('should return empty array for undefined', () => {
    expect(extractEmails(undefined)).toEqual([]);
  });
});

describe('filterTestRecipients', () => {
  it('should remove test recipients from arrays and keep real recipients', () => {
    const result = filterTestRecipients([
      'user@example.com',
      'internaltest+abc@focusbear.io',
      { email: 'another@example.com' },
      { email: 'internaltest@company.com' },
    ]);

    expect(result.filtered).toEqual(['user@example.com', { email: 'another@example.com' }]);
    expect(result.removedEmails).toEqual(['internaltest+abc@focusbear.io', 'internaltest@company.com']);
  });

  it('should return undefined when a single recipient is filtered out', () => {
    const result = filterTestRecipients('internaltest@focusbear.io');

    expect(result.filtered).toBeUndefined();
    expect(result.removedEmails).toEqual(['internaltest@focusbear.io']);
  });
});
