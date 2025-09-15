let bcrypt = require('bcryptjs');
let jwt = require('jsonwebtoken');
let User = require('../models/User.model');
let config = require('../config/index');
let bus = require('../events/index');

let JWT_SECRET = config.JWT_SECRET;
let JWT_EXPIRES_IN = config.JWT_EXPIRES_IN || '7d';

async function register(req, res, next) {
  try {
    let { name, email, password, role = 'user', phone, bio } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }

    let existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    let hashed = await bcrypt.hash(password, 10);
    let user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashed,
      role,
      phone: phone || '',
      bio: bio || ''
    });

    bus.emit('user.created', { userId: user._id, email: user.email, role: user.role });

    let userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({ user: userObj });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    let { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'email and password are required' });

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    let match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    let payload = { id: user._id.toString(), role: user.role, email: user.email };
    let token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    let userObj = user.toObject();
    delete userObj.password;

    bus.emit('user.logged_in', { userId: user._id, email: user.email });

    res.json({ user: userObj, token });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    let userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    let user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me };
