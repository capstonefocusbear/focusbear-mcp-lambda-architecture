/**
 * Checks if an email belongs to a test account.
 * We intentionally support broad legacy matching (`includes('internaltest')`)
 * in addition to the canonical internaltest+alias@focusbear.io format.
 */
export function isTestEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return normalized.includes('internaltest') || /^internaltest(\+.*)?@focusbear\.io$/i.test(normalized);
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
