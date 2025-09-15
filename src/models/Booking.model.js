let mongoose = require('mongoose');
let { Schema } = mongoose;

let BookingSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  advocateId: { type: Schema.Types.ObjectId, ref: 'Advocate', required: true, index: true },
  slot: {
    start: { type: Date, required: true, index: true },
    end: { type: Date, required: true }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
    default: 'pending',
    index: true
  },
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  paymentId: { type: Schema.Types.ObjectId, ref: 'PaymentRecord', default: null },
  notes: { type: String, default: '' },
  meta: { type: Schema.Types.Mixed, default: {} }
}, {
  timestamps: true
});

BookingSchema.index({ advocateId: 1, 'slot.start': 1, status: 1 });

module.exports = mongoose.model('Booking', BookingSchema);
