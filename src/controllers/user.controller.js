let User = require('../models/User.model');
let bus = require('../events/index');

async function getProfile(req, res, next) {
  try {
    let id = req.params.id === 'me' ? req.user?.id : req.params.id;
    if (!id) return res.status(400).json({ message: 'Invalid user id' });

    let user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    let userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    let allowed = ['name', 'phone', 'bio', 'avatarUrl'];
    let updates = {};
    for (let key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    let user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    bus.emit('user.updated', { userId: user._id });

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    let page = Math.max(1, parseInt(req.query.page || '1', 10));
    let limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    let skip = (page - 1) * limit;

    let [users, total] = await Promise.all([
      User.find().select('-password').skip(skip).limit(limit).lean(),
      User.countDocuments()
    ]);

    res.json({ users, meta: { total, page, limit } });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile, listUsers };
