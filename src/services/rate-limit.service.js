const cache = require('./cache.service');

function assertRateLimit({ key, limit, windowSeconds }) {
  const cacheKey = `ratelimit:${key}`;
  let current = cache.get(cacheKey);
  const now = Date.now();

  // Si on n'a pas d'entrée, ou si la fenêtre de temps passée est dépassée (sécurité)
  if (!current || !current.expiresAt || now > current.expiresAt) {
    current = { count: 0, expiresAt: now + windowSeconds * 1000 };
  }

  if (current.count >= limit) {
    const error = new Error(`Rate limit dépassé pour ${key}`);
    error.status = 429;
    throw error;
  }

  const remainingTtl = Math.max(0, (current.expiresAt - now) / 1000);
  cache.set(cacheKey, { count: current.count + 1, expiresAt: current.expiresAt }, remainingTtl || windowSeconds);
}

module.exports = {
  assertRateLimit,
};
