let mongoose = require('mongoose');
let { Schema } = mongoose;

let UserDocumentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  templateId: { type: Schema.Types.ObjectId, ref: 'Template', default: null },
  filledData: { type: Schema.Types.Mixed, default: {} },
  filename: { type: String, required: true },
  originalName: { type: String, default: '' },
  mimetype: { type: String, default: '' },
  size: { type: Number, default: 0 },
  path: { type: String, required: true }, 
  encrypted: { type: Boolean, default: false },
  meta: { type: Schema.Types.Mixed, default: {} }
}, {
  timestamps: true
});

module.exports = mongoose.model('UserDocument', UserDocumentSchema);
