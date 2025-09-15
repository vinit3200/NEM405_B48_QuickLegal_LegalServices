let CaseModel = require('../models/Case.model');

async function findSimilar(caseDoc, { limit = 5 } = {}) {
  let q = `${caseDoc.title} ${caseDoc.description || ''}`.trim();
  let textMatches = await CaseModel.find(
    { $text: { $search: q }, _id: { $ne: caseDoc._id } },
    { score: { $meta: 'textScore' }, title: 1, description: 1, tags: 1, outcome: 1 }
  ).sort({ score: { $meta: 'textScore' } }).limit(20).lean();

  let inputTags = new Set((caseDoc.tags || []).map(t => t.toLowerCase()));
  let scored = textMatches.map(m => {
    let mtags = new Set((m.tags || []).map(t => t.toLowerCase()));
    let intersection = [...inputTags].filter(x => mtags.has(x)).length;
    let union = new Set([...inputTags, ...mtags]).size || 1;
    let tagScore = intersection / union;
    let combined = (m.score || 0) + tagScore;
    return { case: m, tagScore, textScore: m.score || 0, combined };
  });

  scored.sort((a, b) => b.combined - a.combined);
  return scored.slice(0, limit).map(s => ({
    id: s.case._id,
    title: s.case.title,
    snippet: (s.case.description || '').slice(0, 300),
    tags: s.case.tags,
    outcome: s.case.outcome,
    score: s.combined
  }));
}

module.exports = { findSimilar };
