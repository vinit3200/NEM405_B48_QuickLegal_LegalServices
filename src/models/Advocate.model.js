let mongoose = require('mongoose');
let { Schema } = mongoose;

let AvailabilitySlotSchema = new Schema({
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
  startTime: { type: String, required: true }, 
  endTime: { type: String, required: true }    
}, { _id: false });

const AdvocateSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  expertise: { type: [String], default: [] },
  practiceAreas: { type: [String], default: [] },
  languages: { type: [String], default: [] },
  consultationFee: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  availability: { type: [AvailabilitySlotSchema], default: [] },
  bio: { type: String, default: '' },
  address: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

AdvocateSchema.index({ expertise: 1 }, { name: 'adv_expertise_idx' });

module.exports = mongoose.model('Advocate', AdvocateSchema);
