let mongoose = require('mongoose');
let Booking = require('../models/Booking.model');
let Advocate = require('../models/Advocate.model');
let PaymentRecord = require('../models/PaymentRecord.model');
let bus = require('../events/index');
let redisLock = require('../utils/redisLock.util');

async function _hasOverlap(advocateId, start, end) {
  let overlapping = await Booking.findOne({
    advocateId,
    status: { $in: ['pending','confirmed'] },
    $or: [
      { 'slot.start': { $lt: end }, 'slot.end': { $gt: start } }
    ]
  }).lean();
  return !!overlapping;
}

async function createBooking({ userId, advocateId, slotStart, slotEnd, amount = null, currency = 'INR' }) {
  if (!userId) throw Object.assign(new Error('userId required'), { status: 400 });
  let adv = await Advocate.findById(advocateId).lean();
  if (!adv) throw Object.assign(new Error('Advocate not found'), { status: 404 });

  let start = new Date(slotStart);
  let end = new Date(slotEnd);
  if (isNaN(start.valueOf()) || isNaN(end.valueOf()) || start >= end) {
    throw Object.assign(new Error('Invalid slot times'), { status: 400 });
  }

  let lockKey = `lock:adv:${advocateId}:${start.toISOString()}`;
  let lockToken = null;
  try {
    lockToken = await redisLock.acquire(lockKey, 5000); 
  } catch (e) {
    console.warn('Redis lock failed', e?.message || e);
  }

  try {
    let overlap = await _hasOverlap(advocateId, start, end);
    if (overlap) throw Object.assign(new Error('Slot not available'), { status: 409 });

    let session = await mongoose.startSession();
    session.startTransaction();
    try {
      let bookingDoc = await Booking.create([{
        userId,
        advocateId,
        slot: { start, end },
        status: 'pending',
        amount: amount !== null ? amount : (adv.consultationFee || 0),
        currency
      }], { session });

      await session.commitTransaction();
      session.endSession();

      let created = bookingDoc[0];
      bus.emit('booking.created', created);
      return created;
    } catch (err) {
      await session.abortTransaction().catch(()=>null);
      session.endSession();
      throw err;
    }
  } finally {
    if (lockToken) {
      try { await redisLock.release(lockKey, lockToken); } catch (e) {  }
    }
  }
}

async function confirmBooking(bookingId, { provider = 'simulated', providerPaymentId = null } = {}) {
  let booking = await Booking.findById(bookingId);
  if (!booking) throw Object.assign(new Error('Booking not found'), { status: 404 });

  let payment = await PaymentRecord.create({
    bookingId: booking._id,
    userId: booking.userId,
    amount: booking.amount || 0,
    currency: booking.currency,
    provider,
    providerPaymentId,
    status: 'succeeded'
  });

  booking.status = 'confirmed';
  booking.paymentId = payment._id;
  await booking.save();

  bus.emit('payment.succeeded', payment);
  bus.emit('booking.confirmed', booking);

  return { booking, payment };
}

async function cancelBooking(bookingId) {
  let booking = await Booking.findById(bookingId);
  if (!booking) throw Object.assign(new Error('Booking not found'), { status: 404 });
  booking.status = 'cancelled';
  await booking.save();
  bus.emit('booking.cancelled', booking);
  return booking;
}

async function listBookings({ userId = null, advocateId = null, page = 1, limit = 20 } = {}) {
  let filter = {};
  if (userId) filter.userId = userId;
  if (advocateId) filter.advocateId = advocateId;
  let p = Math.max(1, parseInt(page, 10));
  let l = Math.min(100, parseInt(limit, 10));
  let skip = (p - 1) * l;
  let [bookings, total] = await Promise.all([
    Booking.find(filter).sort({ 'slot.start': -1 }).skip(skip).limit(l).lean(),
    Booking.countDocuments(filter)
  ]);
  return { bookings, meta: { total, page: p, limit: l } };
}

module.exports = { createBooking, confirmBooking, cancelBooking, listBookings };
