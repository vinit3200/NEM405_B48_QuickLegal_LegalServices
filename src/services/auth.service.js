let bcrypt = require('bcryptjs');
let jwt = require('jsonwebtoken');
let User = require('../models/User.model');
let config = require('../config/index');
let bus = require('../events/index');

let JWT_SECRET = config.JWT_SECRET;
let JWT_EXPIRES_IN = config.JWT_EXPIRES_IN || '7d';

async function register({ name, email, password, role = 'user', phone = '', bio = '' }) {
  let existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    let err = new Error('Email already in use');
    err.status = 409;
    throw err;
  }
  let hashed = await bcrypt.hash(password, 10);
  let user = await User.create({
    name,
    email: email.toLowerCase(),
    password: hashed,
    role,
    phone,
    bio
  });

  bus.emit('user.created', { userId: user._id, email: user.email, role: user.role });
  let u = user.toObject();
  delete u.password;
  return u;
}

async function login({ email, password }) {
  let user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    let err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  let ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    let err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  let payload = { id: user._id.toString(), role: user.role, email: user.email };
  let token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  bus.emit('user.logged_in', { userId: user._id });

  let u = user.toObject();
  delete u.password;
  return { user: u, token };
}

module.exports = { register, login };
