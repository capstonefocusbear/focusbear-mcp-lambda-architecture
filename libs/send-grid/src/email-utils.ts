/**
 * Checks if an email belongs to a test account.
 * We intentionally keep broad legacy matching (`includes('internaltest')`),
 * which also covers canonical forms like internaltest@focusbear.io and
 * internaltest+alias@focusbear.io. We also suppress guest/anonymous account
 * emails generated in the app (anonymoususer+<uuid>@focusbear.com).
 */
export const GUEST_EMAIL_PATTERN =
  /^anonymoususer\+[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}@focusbear\.com$/i;

export function isTestEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return normalized.includes('internaltest') || GUEST_EMAIL_PATTERN.test(normalized);
}

export type EmailRecipient = string | { name?: string; email: string };
export type EmailRecipients = EmailRecipient | EmailRecipient[] | undefined;

/**
 * Extracts email address strings from SendGrid's EmailData format.
 * EmailData can be: string | { name?: string; email: string }
 * The `to` field can be: EmailData | EmailData[]
 */
export function extractEmails(to: EmailRecipients): string[] {
  if (!to) return [];
  const recipients = Array.isArray(to) ? to : [to];
  return recipients.map((r) => (typeof r === 'string' ? r : r.email));
}

/**
 * Removes test-account recipients while preserving the original single-vs-array shape.
 */
export function filterTestRecipients(recipients: EmailRecipients): {
  filtered: EmailRecipients;
  removedEmails: string[];
} {
  if (!recipients) {
    return { filtered: undefined, removedEmails: [] };
  }

  const originalIsArray = Array.isArray(recipients);
  const normalizedRecipients = originalIsArray ? recipients : [recipients];
  const filteredRecipients: EmailRecipient[] = [];
  const removedEmails: string[] = [];

  for (const recipient of normalizedRecipients) {
    const email = typeof recipient === 'string' ? recipient : recipient.email;

    if (isTestEmail(email)) {
      removedEmails.push(email);
    } else {
      filteredRecipients.push(recipient);
    }
  }

  if (filteredRecipients.length === 0) {
    return { filtered: undefined, removedEmails };
  }

  if (!originalIsArray) {
    return { filtered: filteredRecipients[0], removedEmails };
  }

  return { filtered: filteredRecipients, removedEmails };
}
