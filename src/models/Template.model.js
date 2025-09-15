let mongoose = require('mongoose');
let { Schema } = mongoose;

let FieldSchema = new Schema({
  name: String,
  label: String,
  type: String,
  placeholder: { type: String, default: '' },
  required: { type: Boolean, default: false }
}, { _id: true });

let TemplateSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  fields: { type: [FieldSchema], default: [] },
  templateBody: { type: String, default: '' },
  tags: { type: [String], default: [] },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  isPublic: { type: Boolean, default: false }
}, { timestamps: true });

TemplateSchema.index({ title: 'text', description: 'text' }, { name: 'template_text_idx' });

module.exports = mongoose.model('Template', TemplateSchema);
