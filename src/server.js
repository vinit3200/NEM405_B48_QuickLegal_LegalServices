'use strict';

let http = require('http');
let app = require('./app');
let config = require('./config');
let { connectDB, disconnectDB } = require('./db/mongoose');
let { getClient: getRedisClient, quitClient: quitRedisClient } = require('./db/redis');
let { initWebsocketServer } = require('./websocket/ws');
let logger = require('./utils/logger');

require('./events');

let cron = null;
try {
  cron = require('node-cron');
} catch (e) {
  logger.info('node-cron not installed; scheduled jobs disabled (install node-cron to enable).');
}

let PORT = config.PORT || 4000;

let server = null;
let redisClient = null;

async function start() {
  try {
    logger.info('Starting QuickLegal backend', { env: config.NODE_ENV });

    await connectDB();
    logger.info('MongoDB connected');

    try {
      redisClient = await getRedisClient();
      logger.info('Redis connected');
    } catch (err) {
      logger.warn('Redis connection failed (continuing without Redis)', { err: err?.message || String(err) });
      redisClient = null;
    }

    server = http.createServer(app);

    try {
      initWebsocketServer(server, { path: '/ws', pingIntervalMs: 30000 });
      logger.info('WebSocket server initialized');
    } catch (err) {
      logger.warn('Failed to init WebSocket server', { err: err?.message || String(err) });
    }

    await new Promise((resolve, reject) => {
      server.listen(PORT, (err) => {
        if (err) return reject(err);
        logger.info('HTTP server listening', { port: PORT });
        return resolve();
      });
    });

    if (cron) {
      try {
        cron.schedule('0 * * * *', () => {
          logger.info('Scheduled job: hourly cleanup (no-op by default)');
        });

        cron.schedule('0 7 * * *', () => {
          logger.info('Scheduled job: daily reminders (implement in src/cron or services)');
        });

        logger.info('Cron jobs scheduled');
      } catch (err) {
        logger.warn('Failed to register cron jobs', { err: err?.message || String(err) });
      }
    }

    let gracefulShutdown = async (signal) => {
      try {
        logger.info('Graceful shutdown initiated', { signal });

        if (server) {
          logger.info('Closing HTTP server...');
          await new Promise((resolve) => server.close(resolve));
          logger.info('HTTP server closed');
        }

        try {
          if (redisClient) {
            await quitRedisClient();
            logger.info('Redis client quit');
          }
        } catch (err) {
          logger.warn('Error quitting Redis client', { err: err?.message || String(err) });
        }

        try {
          await disconnectDB();
          logger.info('MongoDB disconnected');
        } catch (err) {
          logger.warn('Error disconnecting MongoDB', { err: err?.message || String(err) });
        }

        logger.info('Shutdown complete');
        process.exit(0);
      } catch (err) {
        logger.error('Error during graceful shutdown', { err: err?.message || String(err) });
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    process.on('uncaughtException', (err) => {
      logger.error('uncaughtException', { err: err?.message || String(err) });
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('unhandledRejection', { reason: reason ? (reason.message || String(reason)) : 'unknown' });
    });

    logger.info('QuickLegal backend started successfully', { port: PORT });
  } catch (err) {
    logger.error('Failed to start server', { err: err?.message || String(err) });
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { start, getServer: () => server };
