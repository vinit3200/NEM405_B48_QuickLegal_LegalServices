let { getClient } = require('../db/redis');
let logger = require('../utils/logger');

function defaultKeyGenerator(req) {
  let xff = req.headers['x-forwarded-for'];
  if (xff) return xff.split(',')[0].trim();
  return req.ip || req.connection.remoteAddress || 'unknown';
}

function rateLimit(opts = {}) {
  let {
    windowMs = 15 * 60 * 1000, 
    max = 100,
    keyGenerator = defaultKeyGenerator,
    message = 'Too many requests, please try again later.'
  } = opts;

  let memoryStore = new Map();

  return async function rateLimiter(req, res, next) {
    let key = `rate:${keyGenerator(req)}`;

    try {
      let redis = await getClient().catch(() => null);
      if (redis) {
        let ttlSeconds = Math.ceil(windowMs / 1000);
        let current = await redis.incr(key);
        if (current === 1) {
          await redis.expire(key, ttlSeconds);
        }
        let remaining = Math.max(0, max - current);
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));
        res.setHeader('X-RateLimit-Reset', Date.now() + (ttlSeconds * 1000));

        if (current > max) {
          res.status(429).json({ message });
          return;
        }
        return next();
      }
    } catch (err) {
      logger.warn('Redis rate-limit error, falling back to memory store', { err: err.message });
    }

    try {
      let now = Date.now();
      let record = memoryStore.get(key);
      if (!record || record.resetAt <= now) {
        memoryStore.set(key, { count: 1, resetAt: now + windowMs });
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', max - 1);
        res.setHeader('X-RateLimit-Reset', now + windowMs);
        return next();
      } else {
        record.count += 1;
        let remaining = Math.max(0, max - record.count);
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', record.resetAt);
        if (record.count > max) {
          res.status(429).json({ message });
          return;
        }
        return next();
      }
    } catch (err) {
      logger.error('Rate limiter error', { err: err.message });
      return next();
    }
  };
}

module.exports = rateLimit;
