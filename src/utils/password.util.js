'use strict';

let bcrypt = require('bcryptjs');

async function hashPassword(password, rounds = 10) {
  return bcrypt.hash(password, rounds);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = { hashPassword, comparePassword };
