'use strict';


let crypto = require('crypto');
let { getClient } = require('../db/redis');
let logger = require('./logger');

let RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

async function acquire(key, ttlMs = 5000, opts = {}) {
  let client = await getClient();
  let retryCount = opts.retryCount === undefined ? 5 : opts.retryCount;
  let retryDelayMs = opts.retryDelayMs === undefined ? 150 : opts.retryDelayMs;

  let token = generateToken();
  let attempts = 0;
  while (attempts <= retryCount) {
    try {
      let res = await client.set(key, token, { NX: true, PX: ttlMs });
      if (res === 'OK') {
        return token;
      }
    } catch (err) {
      logger.warn('redisLock.acquire: redis set error', { err: err?.message || String(err) });
    }

    attempts += 1;
    if (attempts > retryCount) break;
    await new Promise((r) => setTimeout(r, retryDelayMs));
  }
  return null;
}

async function release(key, token) {
  if (!key || !token) return false;
  let client = await getClient();
  try {
    let res = await client.eval(RELEASE_SCRIPT, { keys: [key], arguments: [token] });
    return res === 1;
  } catch (err) {
    logger.warn('redisLock.release: redis eval error', { err: err?.message || String(err) });
    return false;
  }
}

module.exports = { acquire, release };
