let Advocate = require('../models/Advocate.model');
let User = require('../models/User.model');

async function createAdvocate(userId, { expertise = [], consultationFee = 0, languages = [], bio = '' } = {}) {
  let exists = await Advocate.findOne({ userId });
  if (exists) {
    let err = new Error('Advocate profile already exists');
    err.status = 409;
    throw err;
  }
  let adv = await Advocate.create({
    userId,
    expertise: Array.isArray(expertise) ? expertise : [expertise],
    consultationFee: Number(consultationFee),
    languages,
    bio
  });
  return adv;
}

async function updateAdvocate(advocateId, updates = {}) {
  let allowed = ['expertise','practiceAreas','languages','consultationFee','bio','availability','isActive','address'];
  let payload = {};
  for (let k of allowed) if (updates[k] !== undefined) payload[k] = updates[k];
  let adv = await Advocate.findByIdAndUpdate(advocateId, payload, { new: true, runValidators: true });
  if (!adv) {
    let err = new Error('Advocate not found');
    err.status = 404;
    throw err;
  }
  return adv;
}

async function search({ q, expertise, language, minFee, maxFee, page = 1, limit = 20 } = {}) {
  let filter = { isActive: true };
  if (expertise) filter.expertise = { $in: Array.isArray(expertise) ? expertise : [expertise] };
  if (language) filter.languages = { $in: Array.isArray(language) ? language : [language] };
  if (minFee) filter.consultationFee = { ...(filter.consultationFee || {}), $gte: Number(minFee) };
  if (maxFee) filter.consultationFee = { ...(filter.consultationFee || {}), $lte: Number(maxFee) };

  let query;
  if (q) {
    try {
      query = Advocate.find({ $text: { $search: q }, ...filter }, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
    } catch (e) {
      let re = new RegExp(q, 'i');
      query = Advocate.find({ ...filter, $or: [{ bio: re }, { expertise: re }, { practiceAreas: re }] });
    }
  } else {
    query = Advocate.find(filter);
  }

  let p = Math.max(1, parseInt(page, 10));
  let l = Math.min(100, parseInt(limit, 10));
  let skip = (p - 1) * l;

  let advocates = await query.skip(skip).limit(l).lean();

  let userIds = advocates.map(a => a.userId).filter(Boolean);
  let users = await User.find({ _id: { $in: userIds } }).select('_id name email avatarUrl').lean();
  let usersById = users.reduce((acc, u) => { acc[u._id.toString()] = u; return acc; }, {});
  let results = advocates.map(a => ({ ...a, user: usersById[a.userId?.toString()] || null }));
  return { advocates: results, meta: { page: p, limit: l } };
}

async function getById(id) {
  let adv = await Advocate.findById(id).lean();
  if (!adv) {
    let err = new Error('Advocate not found');
    err.status = 404;
    throw err;
  }
  let user = await User.findById(adv.userId).select('-password').lean();
  return { advocate: adv, user };
}

module.exports = { createAdvocate, updateAdvocate, search, getById };
