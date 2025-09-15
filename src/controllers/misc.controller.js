let os = require('os');
let mongoose = require('mongoose');

async function health(req, res) {
  let mem = process.memoryUsage();
  let uptime = process.uptime();
  let mongoState = (mongoose && mongoose.connection && mongoose.connection.readyState) || 0;
  res.json({
    status: 'ok',
    env: process.env.NODE_ENV || 'development',
    pid: process.pid,
    uptime,
    memory: mem,
    platform: os.platform(),
    mongoState
  });
}

function status(req, res) {
  res.json({ status: 'ok', timestamp: Date.now() });
}

module.exports = { health, status };
