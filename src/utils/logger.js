'use strict';


function safeSerialize(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    return { toString: obj && obj.toString ? obj.toString() : String(obj) };
  }
}

function log(level, msg, meta = {}) {
  let payload = {
    ts: new Date().toISOString(),
    level,
    message: msg,
    ...safeSerialize(meta)
  };
  let out = JSON.stringify(payload);
  if (level === 'error') console.error(out);
  else if (level === 'warn') console.warn(out);
  else console.log(out);
}

module.exports = {
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
  debug: (msg, meta) => {
    if ((process.env.LOG_LEVEL || 'info') === 'debug') log('debug', msg, meta);
  }
};
