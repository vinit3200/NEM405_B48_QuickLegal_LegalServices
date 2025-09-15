'use strict';

let path = require('path');
let dotenv = require('dotenv');
let fs = require('fs');

let envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

function assertEnv(name, value) {
  if (!value || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

let config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 4000,

  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/quicklegal_dev',

  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  UPLOAD_DIR: process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),

  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_SECURE: (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',

  DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE, 10) || 20,
  MAX_UPLOAD_FILESIZE_BYTES: parseInt(process.env.MAX_UPLOAD_FILESIZE_BYTES, 10) || 10 * 1024 * 1024, 

  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

try {
  if (config.NODE_ENV !== 'development' && config.NODE_ENV !== 'test') {
    assertEnv('MONGO_URI', config.MONGO_URI);
    assertEnv('JWT_SECRET', config.JWT_SECRET);
  } else {
    if (!config.JWT_SECRET) {
      console.warn('Warning: JWT_SECRET is not set. Using empty secret (not secure). Set JWT_SECRET in .env for better security.');
    }
  }
} catch (err) {
  console.error('Configuration validation failed:', err.message);
  throw err;
}

module.exports = config;
