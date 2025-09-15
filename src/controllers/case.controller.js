let CaseModel = require('../models/Case.model');
let mongoose = require('mongoose');

async function createCase(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    let { title, description = '', tags = [], caseType = '' } = req.body || {};
    if (!title) return res.status(400).json({ message: 'title is required' });

    let created = await CaseModel.create({
      userId: req.user.id,
      title,
      description,
      tags: Array.isArray(tags) ? tags : [tags],
      caseType
    });

    let matches = await findSimilarCases(created);

    res.status(201).json({ case: created, similar: matches });
  } catch (err) {
    next(err);
  }
}

async function findSimilarCases(caseDoc) {
  let q = caseDoc.title + ' ' + (caseDoc.description || '');
  let textMatches = await CaseModel.find(
    { $text: { $search: q }, _id: { $ne: caseDoc._id } },
    { score: { $meta: 'textScore' }, title: 1, description: 1, tags: 1, outcome: 1 }
  ).sort({ score: { $meta: 'textScore' } }).limit(10).lean();

  let inputTags = new Set((caseDoc.tags || []).map(t => t.toLowerCase()));

  let scored = textMatches.map(m => {
    let mtags = new Set((m.tags || []).map(t => t.toLowerCase()));
    let intersection = [...inputTags].filter(x => mtags.has(x)).length;
    let union = new Set([...inputTags, ...mtags]).size || 1;
    let tagScore = intersection / union;
    return { case: m, tagScore, textScore: m.score || 0, combined: (m.score || 0) + tagScore };
  });

  scored.sort((a, b) => b.combined - a.combined);

  return scored.slice(0, 5).map(s => ({
    id: s.case._id,
    title: s.case.title,
    snippet: (s.case.description || '').slice(0, 300),
    tags: s.case.tags,
    outcome: s.case.outcome,
    score: s.combined
  }));
}

async function getCase(req, res, next) {
  try {
    let id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });

    let c = await CaseModel.findById(id).lean();
    if (!c) return res.status(404).json({ message: 'Case not found' });

    res.json({ case: c });
  } catch (err) {
    next(err);
  }
}

async function listCases(req, res, next) {
  try {
    let page = Math.max(1, parseInt(req.query.page || '1', 10));
    let limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    let skip = (page - 1) * limit;

    let filter = {};
    if (req.user.role !== 'admin') filter.userId = req.user.id;

    let [cases, total] = await Promise.all([
      CaseModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      CaseModel.countDocuments(filter)
    ]);

    res.json({ cases, meta: { total, page, limit } });
  } catch (err) {
    next(err);
  }
}

module.exports = { createCase, getCase, listCases };
