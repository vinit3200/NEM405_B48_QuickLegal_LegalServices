let User = require('../models/User.model');
let bus = require('../events/index');

async function getById(id) {
  return User.findById(id).select('-password').lean();
}

async function updateProfile(userId, updates = {}) {
  let allowed = ['name', 'phone', 'bio', 'avatarUrl'];
  let payload = {};
  for (let k of allowed) if (updates[k] !== undefined) payload[k] = updates[k];
  if (Object.keys(payload).length === 0) {
    let err = new Error('No valid fields to update');
    err.status = 400;
    throw err;
  }
  let user = await User.findByIdAndUpdate(userId, payload, { new: true, runValidators: true }).select('-password');
  bus.emit('user.updated', { userId });
  return user;
}

async function listAll({ page = 1, limit = 20 } = {}) {
  let p = Math.max(1, parseInt(page, 10));
  let l = Math.min(100, parseInt(limit, 10));
  let skip = (p - 1) * l;
  let [users, total] = await Promise.all([
    User.find().select('-password').skip(skip).limit(l).lean(),
    User.countDocuments()
  ]);
  return { users, meta: { total, page: p, limit: l } };
}

module.exports = { getById, updateProfile, listAll };
