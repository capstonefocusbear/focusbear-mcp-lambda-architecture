"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GUEST_EMAIL_PATTERN = void 0;
exports.isTestEmail = isTestEmail;
exports.extractEmails = extractEmails;
exports.filterTestRecipients = filterTestRecipients;
exports.GUEST_EMAIL_PATTERN = /^anonymoususer\+[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}@focusbear\.com$/i;
function isTestEmail(email) {
    if (!email)
        return false;
    const normalized = email.trim().toLowerCase();
    return normalized.includes('internaltest') || exports.GUEST_EMAIL_PATTERN.test(normalized);
}
function extractEmails(to) {
    if (!to)
        return [];
    const recipients = Array.isArray(to) ? to : [to];
    return recipients.map((r) => (typeof r === 'string' ? r : r.email));
}
function filterTestRecipients(recipients) {
    if (!recipients) {
        return { filtered: undefined, removedEmails: [] };
    }
    const originalIsArray = Array.isArray(recipients);
    const normalizedRecipients = originalIsArray ? recipients : [recipients];
    const filteredRecipients = [];
    const removedEmails = [];
    for (const recipient of normalizedRecipients) {
        const email = typeof recipient === 'string' ? recipient : recipient.email;
        if (isTestEmail(email)) {
            removedEmails.push(email);
        }
        else {
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
//# sourceMappingURL=email-utils.js.map