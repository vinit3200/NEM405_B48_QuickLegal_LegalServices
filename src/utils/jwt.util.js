'use strict';

let jwt = require('jsonwebtoken');
let config = require('../config/index');

let SECRET = config.JWT_SECRET || 'changeme';
let EXPIRES_IN = config.JWT_EXPIRES_IN || '7d';

function signToken(payload = {}, opts = {}) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN, ...opts });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signToken, verifyToken };
