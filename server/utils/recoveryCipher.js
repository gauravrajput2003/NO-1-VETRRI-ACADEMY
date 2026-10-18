const { randomBytes, createCipheriv, createDecipheriv } = require('node:crypto');

function createRecoveryCipher(encodedKey) {
  if (typeof encodedKey !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(encodedKey)) {
    throw new Error('PASSWORD_RECOVERY_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  }
  const key = Buffer.from(encodedKey, 'base64');
  if (key.length !== 32) throw new Error('Invalid recovery encryption key.');
  return {
    seal(value, purpose) {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from(String(purpose)));
      const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
      return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join('.');
    },
    open(envelope, purpose) {
      const [version, iv, tag, encrypted, extra] = String(envelope).split('.');
      if (version !== 'v1' || extra || !iv || !tag || !encrypted) throw new Error('Invalid encrypted recovery payload.');
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
      decipher.setAAD(Buffer.from(String(purpose)));
      decipher.setAuthTag(Buffer.from(tag, 'base64'));
      return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]).toString('utf8'));
    },
  };
}

const recoveryCipher = () => createRecoveryCipher(process.env.PASSWORD_RECOVERY_ENCRYPTION_KEY);
module.exports = { createRecoveryCipher, recoveryCipher };
