const { randomInt } = require('node:crypto');

const TEMP_PASSWORD_TTL_HOURS = 24;
const RESET_REQUEST_PENDING_DAYS = 7;
const RESET_MAX_FAILED_ATTEMPTS = 5;
const RESET_REQUESTS_PER_HOUR = 3;
const RECOVERY_REQUEST_MESSAGE = 'Request sent. Your admin will send you a temporary password.';
const RECOVERY_FAILURE_MESSAGE = 'Unable to reset your password. Check the details or ask your admin for a new temporary password.';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generateTemporaryPassword() {
  const characters = Array.from({ length: 9 }, () => ALPHABET[randomInt(ALPHABET.length)]);
  characters.splice(4, 0, '-');
  return characters.join('');
}

function expiryFromSend(sentAt, hours = TEMP_PASSWORD_TTL_HOURS) {
  return new Date(+new Date(sentAt) + hours * 3600000);
}

function canCompleteReset(request, now = new Date()) {
  return Boolean(request && request.status === 'sent'
    && request.failedAttempts < RESET_MAX_FAILED_ATTEMPTS
    && request.tempPasswordExpiresAt && +new Date(request.tempPasswordExpiresAt) > +now);
}

function eligibleForRecovery(user) {
  return Boolean(user && ['student', 'teacher'].includes(user.role)
    && user.isActive === true && user.isApproved !== false);
}

function validNewPassword(password, confirmation, temporaryPassword) {
  return typeof password === 'string' && typeof confirmation === 'string'
    && password.length >= 6 && Buffer.byteLength(password, 'utf8') <= 72
    && password === confirmation && password !== temporaryPassword;
}

module.exports = {
  TEMP_PASSWORD_TTL_HOURS, RESET_REQUEST_PENDING_DAYS, RESET_MAX_FAILED_ATTEMPTS,
  RESET_REQUESTS_PER_HOUR, RECOVERY_REQUEST_MESSAGE, RECOVERY_FAILURE_MESSAGE,
  generateTemporaryPassword, expiryFromSend, canCompleteReset, eligibleForRecovery, validNewPassword,
};
