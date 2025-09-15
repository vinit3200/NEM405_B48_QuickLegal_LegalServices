'use strict';

let WebSocket = require('ws');
let url = require('url');
let jwt = require('jsonwebtoken');
let config = require('../config/index');
let logger = require('../utils/logger');

let userConnMap = new Map();
let wss = null;

function safeSend(ws, payload) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  } catch (err) {
    logger.warn('ws.safeSend failed', { err: err?.message || String(err) });
  }
}

async function sendToUser(userId, payload) {
  if (!userId) return 0;
  let conns = userConnMap.get(userId.toString());
  let count = 0;
  if (conns) {
    for (const ws of conns) {
      safeSend(ws, payload);
      count++;
    }
  }
  return count;
}

function broadcast(payload) {
  if (!wss) return 0;
  let message = JSON.stringify(payload);
  let count = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        count++;
      } catch (err) {
        logger.warn('ws.broadcast send error', { err: err?.message || String(err) });
      }
    }
  });
  return count;
}

function getUserConnections(userId) {
  let conns = userConnMap.get(userId?.toString());
  return conns ? conns.size : 0;
}

function initWebsocketServer(httpServer, options = {}) {
  if (!httpServer) throw new Error('httpServer is required to initialize WebSocket server');
  let pathOption = options.path || '/ws';

  if (wss) {
    logger.warn('WebSocket server already initialized');
    return wss;
  }

  wss = new WebSocket.Server({ server: httpServer, path: pathOption, clientTracking: true });

  function noop() {}

  function heartbeat() {
    this.isAlive = true;
  }

  wss.on('connection', (ws, req) => {
    let parsed = url.parse(req.url, true);
    let token = parsed.query && parsed.query.token ? parsed.query.token : null;
    let userPayload = null;
    if (!token) {
      ws.close(4001, 'Missing token');
      return;
    }

    try {
      userPayload = jwt.verify(token, config.JWT_SECRET);
    } catch (err) {
      ws.close(4002, 'Invalid token');
      return;
    }

    let userId = userPayload.id?.toString();
    if (!userId) {
      ws.close(4003, 'Invalid token payload');
      return;
    }

    ws.userId = userId;
    ws.isAlive = true;
    ws.on('pong', heartbeat);

    let set = userConnMap.get(userId);
    if (!set) {
      set = new Set();
      userConnMap.set(userId, set);
    }
    set.add(ws);

    logger.info('ws: connection established', { userId, totalConnections: getUserConnections(userId) });

    safeSend(ws, { type: 'welcome', message: 'connected', userId });

    ws.on('message', (raw) => {
      try {
        let data = JSON.parse(raw);
        if (data && data.type === 'ping') {
          safeSend(ws, { type: 'pong', ts: Date.now() });
          return;
        }
        logger.info('ws: message', { userId, data });
      } catch (err) {
        logger.warn('ws: invalid message received', { err: err?.message || String(err) });
      }
    });

    ws.on('close', (code, reason) => {
      try {
        let s = userConnMap.get(userId);
        if (s) {
          s.delete(ws);
          if (s.size === 0) userConnMap.delete(userId);
        }
      } catch (e) {
        logger.warn('ws: error cleaning up connection', { err: e?.message });
      }
      logger.info('ws: connection closed', { userId, code, reason: String(reason), totalConnections: getUserConnections(userId) });
    });

    ws.on('error', (err) => {
      logger.warn('ws: connection error', { userId, err: err?.message || String(err) });
    });
  });

  let interval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        try { ws.terminate(); } catch (err) { }
        return;
      }
      ws.isAlive = false;
      try { ws.ping(noop); } catch (err) { }
    });
  }, options.pingIntervalMs || 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  logger.info('WebSocket server initialized', { path: pathOption });
  return wss;
}

module.exports = {
  initWebsocketServer,
  sendToUser,
  broadcast,
  getUserConnections
};
