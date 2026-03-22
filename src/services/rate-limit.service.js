const cache = require('./cache.service');

function assertRateLimit({ key, limit, windowSeconds }) {
  const cacheKey = `ratelimit:${key}`;
  const current = cache.get(cacheKey) || { count: 0 };

  if (current.count >= limit) {
    const error = new Error(`Rate limit dépassé pour ${key}`);
    error.status = 429;
    throw error;
  }

  cache.set(cacheKey, { count: current.count + 1 }, windowSeconds);
}

module.exports = {
  assertRateLimit,
};
