let { createClient } = require('redis');
let { REDIS_URL } = require('../config/index');

let client = null;

async function getClient() {
  if (client && client.isOpen) return client;

  if (!REDIS_URL) {
    console.warn('REDIS_URL not set in config; using redis://localhost:6379');
  }

  client = createClient({ url: REDIS_URL || 'redis://localhost:6379' });

  client.on('error', (err) => {
    console.error('Redis Client Error', err);
  });

  client.on('connect', () => {
    console.log('Redis client connecting...');
  });

  client.on('ready', () => {
    console.log('Redis client ready');
  });

  client.on('end', () => {
    console.log('Redis client connection closed');
  });

  try {
    await client.connect();
    return client;
  } catch (err) {
    console.error('Error connecting to Redis:', err);
    throw err;
  }
}

async function quitClient() {
  if (!client) return;
  try {
    await client.quit();
    console.log('Redis client quit');
    client = null;
  } catch (err) {
    console.error('Error quitting Redis client', err);
  }
}

function registerShutdown() {
  let graceful = async () => {
    console.log('SIGINT received - closing Redis connection');
    await quitClient();
    process.exit(0);
  };
  process.on('SIGINT', graceful);
  process.on('SIGTERM', graceful);
}
registerShutdown();

module.exports = {
  getClient,
  quitClient
};