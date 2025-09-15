let nodemailer = require('nodemailer');
let config = require('../config/index');
let ws = require('../websocket/ws'); 
let logger = require('../utils/logger');

let transporter = null;
if (config.SMTP_HOST && config.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT || 587,
    secure: !!config.SMTP_SECURE,
    auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined
  });
} else {
  transporter = {
    sendMail: async (opts) => {
      logger.info('nodemailer: sendMail (noop)', { opts });
      return Promise.resolve({ accepted: [], info: 'noop' });
    }
  };
}

async function sendEmail(opts = {}) {
  try {
    if (!opts.to) throw new Error('Missing email "to"');
    let result = await transporter.sendMail({
      from: config.SMTP_USER || 'no-reply@quicklegal.local',
      to: opts.to,
      subject: opts.subject || 'QuickLegal Notification',
      text: opts.text || '',
      html: opts.html || undefined
    });
    logger.info('Email sent', { to: opts.to, result });
    return result;
  } catch (err) {
    logger.error('Failed to send email', { err: err.message });
    throw err;
  }
}

async function sendWebsocketToUser(userId, payload) {
  try {
    if (!ws || !ws.sendToUser) {
      logger.warn('Websocket helper not available; skipping websocket send', { userId, payload });
      return;
    }
    await ws.sendToUser(userId, payload);
    logger.info('Websocket message sent', { userId, payload });
  } catch (err) {
    logger.error('Websocket send error', { err: err.message });
  }
}

module.exports = { sendEmail, sendWebsocketToUser };
