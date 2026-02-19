/**
 * Encryption Utility — AES-256-GCM
 *
 * Used to encrypt sensitive fields stored in the database:
 * - Twilio auth tokens
 * - API keys
 * - Webhook secrets
 *
 * Requires: FIELD_ENCRYPTION_KEY env var (32-byte hex string)
 * Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Encrypted format stored in DB: "enc:iv_hex:authTag_hex:ciphertext_hex"
 * Unencrypted values pass through transparently (for migration).
 */

import crypto from 'crypto';
import logger from './logger.js';

const ALGORITHM = 'aes-256-gcm';
const ENCODING = 'hex';
const PREFIX = 'enc:';

function getKey() {
  const keyHex = process.env.FIELD_ENCRYPTION_KEY;
  if (!keyHex) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('FIELD_ENCRYPTION_KEY is not set. Sensitive fields stored in plaintext. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    }
    return null;
  }
  if (keyHex.length !== 64) {
    throw new Error('FIELD_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt a plaintext value.
 * Returns "enc:iv:authTag:ciphertext" or the original value if no key configured.
 */
export function encrypt(plaintext) {
  if (!plaintext) return plaintext;

  const key = getKey();
  if (!key) return plaintext; // Graceful degradation if no key set

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${encrypted.toString(ENCODING)}`;
}

/**
 * Decrypt a value encrypted by encrypt().
 * Returns original value if it wasn't encrypted (migration path).
 */
export function decrypt(value) {
  if (!value) return value;
  if (!value.startsWith(PREFIX)) return value; // Not encrypted — pass through

  const key = getKey();
  if (!key) {
    logger.error('FIELD_ENCRYPTION_KEY not set but encrypted value found in database');
    return null;
  }

  try {
    const withoutPrefix = value.slice(PREFIX.length);
    const parts = withoutPrefix.split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted format');

    const [ivHex, authTagHex, ciphertextHex] = parts;
    const iv = Buffer.from(ivHex, ENCODING);
    const authTag = Buffer.from(authTagHex, ENCODING);
    const ciphertext = Buffer.from(ciphertextHex, ENCODING);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch (err) {
    logger.error('Field decryption failed', { error: err.message });
    return null;
  }
}

/**
 * Check if a value is currently encrypted.
 */
export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

/**
 * Encrypt only if not already encrypted (idempotent).
 */
export function encryptIfNeeded(value) {
  if (!value || isEncrypted(value)) return value;
  return encrypt(value);
}

/**
 * Middleware helper: strip encrypted sensitive fields from API responses.
 * Pass the list of field names to redact.
 */
export function redactSensitiveFields(obj, fields = ['twilioAuthToken', 'apiKey', 'webhookSecret']) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = { ...obj };
  for (const field of fields) {
    if (field in result) {
      result[field] = result[field] ? '••••••••' : null;
    }
  }
  return result;
}

export default { encrypt, decrypt, isEncrypted, encryptIfNeeded, redactSensitiveFields };
