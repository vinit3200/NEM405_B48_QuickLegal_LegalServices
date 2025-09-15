let Advocate = require('../models/Advocate.model');
let User = require('../models/User.model');
let mongoose = require('mongoose');

async function listAdvocates(req, res, next) {
  try {
    let { expertise, minFee, maxFee, language, page = 1, limit = 20, q } = req.query;
    let filter = { isActive: true };

    if (expertise) filter.expertise = { $in: Array.isArray(expertise) ? expertise : [expertise] };
    if (language) filter.languages = { $in: Array.isArray(language) ? language : [language] };
    if (minFee) filter.consultationFee = { ...(filter.consultationFee || {}), $gte: Number(minFee) };
    if (maxFee) filter.consultationFee = { ...(filter.consultationFee || {}), $lte: Number(maxFee) };

    let query = Advocate.find(filter);
    if (q) {
      try {
        query = Advocate.find({ $text: { $search: q }, ...filter }, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
      } catch (e) {
        let re = new RegExp(q, 'i');
        query = Advocate.find({ ...filter, $or: [{ bio: re }, { expertise: re }] });
      }
    }

    let p = Math.max(1, parseInt(page, 10));
    let l = Math.min(100, parseInt(limit, 10));
    let skip = (p - 1) * l;

    let advocates = await query.skip(skip).limit(l).lean();

    let userIds = advocates.map(a => a.userId).filter(Boolean);
    let users = await User.find({ _id: { $in: userIds } }).select('_id name email avatarUrl').lean();
    let usersById = users.reduce((acc, u) => { acc[u._id.toString()] = u; return acc; }, {});
    let results = advocates.map(a => ({ ...a, user: usersById[a.userId?.toString()] || null }));

    res.json({ advocates: results, meta: { page: p, limit: l } });
  } catch (err) {
    next(err);
  }
}

async function getAdvocate(req, res, next) {
  try {
    let id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });

    let advocate = await Advocate.findById(id).lean();
    if (!advocate) return res.status(404).json({ message: 'Advocate not found' });

    let user = await User.findById(advocate.userId).select('-password').lean();
    res.json({ advocate: { ...advocate, user } });
  } catch (err) {
    next(err);
  }
}

async function updateAdvocate(req, res, next) {
  try {
    let id = req.params.id;
    let caller = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });

    let advocate = await Advocate.findById(id);
    if (!advocate) return res.status(404).json({ message: 'Advocate not found' });

    if (caller.role !== 'admin' && advocate.userId.toString() !== caller.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    let allowed = ['expertise', 'practiceAreas', 'languages', 'consultationFee', 'bio', 'availability', 'isActive', 'address'];
    let updates = {};
    for (let key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    Object.assign(advocate, updates);
    await advocate.save();

    res.json({ advocate });
  } catch (err) {
    next(err);
  }
}

async function createAdvocate(req, res, next) {
  try {
    let caller = req.user;
    if (!caller) return res.status(401).json({ message: 'Unauthorized' });

    let exists = await Advocate.findOne({ userId: caller.id });
    if (exists) return res.status(409).json({ message: 'Advocate profile already exists' });

    let { expertise = [], consultationFee = 0 } = req.body;
    let adv = await Advocate.create({
      userId: caller.id,
      expertise: Array.isArray(expertise) ? expertise : [expertise],
      consultationFee: Number(consultationFee)
    });

    res.status(201).json({ advocate: adv });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAdvocates, getAdvocate, updateAdvocate, createAdvocate };
