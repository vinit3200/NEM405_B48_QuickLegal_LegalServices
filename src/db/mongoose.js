let mongoose = require('mongoose');
let { MONGO_URI, NODE_ENV } = require('../config/index');

let DEFAULT_RETRY_MS = 2000;
let isConnectedBefore = false;

async function connectDB(retries = 5, retryMs = DEFAULT_RETRY_MS) {
  if (!MONGO_URI) {
    throw new Error('MONGO_URI is not defined in config');
  }

  let opts = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };

  async function tryConnect(remaining) {
    try {
      await mongoose.connect(MONGO_URI, opts);
      isConnectedBefore = true;
      console.log(`MongoDB connected -> ${MONGO_URI}`);
    } catch (err) {
      console.error(`MongoDB connection failed: ${err.message}`);
      if (remaining > 0) {
        console.log(`Retrying MongoDB connection in ${retryMs}ms (${remaining} attempts left)...`);
        await new Promise(res => setTimeout(res, retryMs));
        return tryConnect(remaining - 1);
      } else {
        console.error('Could not connect to MongoDB after multiple attempts');
        throw err;
      }
    }
  }

  return tryConnect(retries);
}

async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (err) {
    console.error('Error while disconnecting MongoDB', err);
  }
}

mongoose.connection.on('connected', () => {
  console.log('Mongoose default connection open');
});

mongoose.connection.on('reconnected', () => {
  console.log('Mongoose reconnected');
});

mongoose.connection.on('disconnected', () => {
  console.warn('Mongoose default connection disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

function registerShutdown() {
  let graceful = async () => {
    console.log('SIGINT received - closing MongoDB connection');
    await disconnectDB();
    process.exit(0);
  };

  process.on('SIGINT', graceful);
  process.on('SIGTERM', graceful);
}

registerShutdown();

module.exports = {
  connectDB,
  disconnectDB,
  mongoose
};
