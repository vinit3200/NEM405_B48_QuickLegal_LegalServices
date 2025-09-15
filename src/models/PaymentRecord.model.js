let mongoose = require('mongoose');
let { Schema } = mongoose;

let PaymentRecordSchema = new Schema({
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', default: null, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  provider: { type: String, default: 'simulated' }, 
  providerPaymentId: { type: String, default: null },
  status: { type: String, enum: ['pending','succeeded','failed','refunded'], default: 'pending' },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, {
  timestamps: true
});

module.exports = mongoose.model('PaymentRecord', PaymentRecordSchema);
