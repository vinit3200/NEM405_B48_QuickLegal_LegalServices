let mongoose = require('mongoose');
let { Schema } = mongoose;

let CaseSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  tags: [{ type: String, index: true }],
  caseType: { type: String, default: '' }, 
  status: { type: String, enum: ['open','in-progress','closed'], default: 'open' },
  outcome: { type: String, default: '' },
  meta: { type: Schema.Types.Mixed, default: {} }
}, {
  timestamps: true
});

CaseSchema.index({ title: 'text', description: 'text', tags: 1 });

module.exports = mongoose.model('Case', CaseSchema);
