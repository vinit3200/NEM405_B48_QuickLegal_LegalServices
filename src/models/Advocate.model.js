let mongoose = require('mongoose');
let { Schema } = mongoose;

let AvailabilitySlotSchema = new Schema({
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
  startTime: { type: String, required: true }, 
  endTime: { type: String, required: true }    
}, { _id: false });

let AdvocateSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  expertise: [{ type: String, index: true }],
  practiceAreas: [{ type: String }],
  languages: [{ type: String }],
  consultationFee: { type: Number, default: 0 },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  ratingsCount: { type: Number, default: 0 },
  availability: [AvailabilitySlotSchema],
  bio: { type: String, default: '' },
  address: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

AdvocateSchema.index({ consultationFee: 1 });
AdvocateSchema.index({ expertise: 1 });

module.exports = mongoose.model('Advocate', AdvocateSchema);
