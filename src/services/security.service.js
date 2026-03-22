const crypto = require('crypto');
const env = require('../config/env');

function createSignature({ videoId, userId, segment, expiresAt }) {
  const payload = `${videoId}:${userId}:${segment}:${expiresAt}`;
  return crypto.createHmac('sha256', env.signingKey).update(payload).digest('hex');
}

function createSignedToken({ videoId, userId = 'guest', segment = 'master', ttlSeconds = 300 }) {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const signature = createSignature({ videoId, userId, segment, expiresAt });

  return {
    token: Buffer.from(JSON.stringify({ videoId, userId, segment, expiresAt, signature })).toString('base64url'),
    expiresAt,
  };
}

function verifySignedToken(token) {
  if (!token) {
    return { valid: false, reason: 'missing_token' };
  }

  try {
    const parsed = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    const expected = createSignature(parsed);

    if (expected !== parsed.signature) {
      return { valid: false, reason: 'invalid_signature' };
    }

    if (parsed.expiresAt < Math.floor(Date.now() / 1000)) {
      return { valid: false, reason: 'expired' };
    }

    return { valid: true, payload: parsed };
  } catch (error) {
    return { valid: false, reason: 'malformed' };
  }
}

module.exports = {
  createSignedToken,
  verifySignedToken,
};
