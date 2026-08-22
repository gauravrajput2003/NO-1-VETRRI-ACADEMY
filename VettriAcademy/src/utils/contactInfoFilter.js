// utils/contactInfoFilter.js
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,}/;
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?(?:\d[-.\s]?){9,}\d/g;

export const containsContactInfo = (text) => {
  if (!text || typeof text !== 'string') return { blocked: false };

  if (EMAIL_REGEX.test(text)) {
    return { blocked: true, reason: 'email' };
  }

  const matches = text.match(PHONE_REGEX) || [];
  for (const match of matches) {
    const digitsOnly = match.replace(/\D/g, '');
    if (digitsOnly.length >= 10) {
      return { blocked: true, reason: 'phone' };
    }
  }

  return { blocked: false };
};

export const contactInfoErrorMessage = (reason) =>
  reason === 'email'
    ? 'Email addresses are not allowed here.'
    : 'Phone numbers are not allowed here.';