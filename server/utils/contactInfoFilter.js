// utils/contactInfoFilter.js

// Matches emails, tolerant of spaced-out attempts like "abc @ gmail . com"
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,}/;

// Matches 10+ digit runs, tolerant of separators like spaces/dashes/dots
// and an optional +91 / 0 prefix — catches "9876543210", "98765 43210",
// "9876-543-210", "+91 9876543210", "091-9876543210" etc.
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?(?:\d[-.\s]?){9,}\d/g;

/**
 * Returns { blocked: boolean, reason?: 'email' | 'phone' }
 */
const containsContactInfo = (text) => {
  if (!text || typeof text !== 'string') return { blocked: false };

  if (EMAIL_REGEX.test(text)) {
    return { blocked: true, reason: 'email' };
  }

  const matches = text.match(PHONE_REGEX) || [];
  for (const match of matches) {
    const digitsOnly = match.replace(/\D/g, '');
    // 10 digits = a plain mobile number; allow up to 12 to cover a +91/0 prefix,
    // but still flag it — the intent is still to share a number.
    if (digitsOnly.length >= 10) {
      return { blocked: true, reason: 'phone' };
    }
  }

  return { blocked: false };
};

module.exports = { containsContactInfo };