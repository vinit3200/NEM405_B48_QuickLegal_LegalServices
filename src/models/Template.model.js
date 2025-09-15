let mongoose = require('mongoose');
let { Schema } = mongoose;

let TemplateSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  fields: [{
    name: { type: String, required: true },
    label: { type: String, default: '' },
    type: { type: String, enum: ['string','number','date','textarea'], default: 'string' },
    placeholder: { type: String, default: '' },
    required: { type: Boolean, default: false }
  }],
  templateBody: { type: String, default: '' },
  tags: [{ type: String }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  isPublic: { type: Boolean, default: true }
}, {
  timestamps: true
});

TemplateSchema.index({ title: 'text', description: 'text', tags: 1 });

module.exports = mongoose.model('Template', TemplateSchema);
