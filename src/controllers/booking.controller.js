let mongoose = require('mongoose');
let Booking = require('../models/Booking.model');
let Advocate = require('../models/Advocate.model');
let PaymentRecord = require('../models/PaymentRecord.model');
let bus = require('../events/index');
let redisLock = require('../utils/redisLock.util'); 

async function hasOverlap(advocateId, newStart, newEnd) {
  let overlapping = await Booking.findOne({
    advocateId,
    status: { $in: ['pending','confirmed'] },
    $or: [
      { 'slot.start': { $lt: newEnd }, 'slot.end': { $gt: newStart } }
    ]
  }).lean();
  return !!overlapping;
}

async function createBooking(req, res, next) {
  let session = await mongoose.startSession().catch(() => null);
  try {
    let userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    let { advocateId, slot } = req.body || {};
    if (!advocateId || !slot || !slot.start || !slot.end) return res.status(400).json({ message: 'advocateId and slot.start/slot.end required' });

    if (!mongoose.Types.ObjectId.isValid(advocateId)) return res.status(400).json({ message: 'Invalid advocateId' });

    let adv = await Advocate.findById(advocateId).lean();
    if (!adv) return res.status(404).json({ message: 'Advocate not found' });

    let start = new Date(slot.start);
    let end = new Date(slot.end);
    if (isNaN(start.valueOf()) || isNaN(end.valueOf()) || start >= end) {
      return res.status(400).json({ message: 'Invalid slot times' });
    }

    let lockKey = `lock:adv:${advocateId}:${start.toISOString()}`;
    let lock;
    try {
      if (redisLock && typeof redisLock.acquire === 'function') {
        lock = await redisLock.acquire(lockKey, 5000); 
      }
    } catch (e) {
      console.warn('Redis lock error', e?.message || e);
    }

    let overlap = await hasOverlap(advocateId, start, end);
    if (lock && typeof redisLock.release === 'function') {
      await redisLock.release(lockKey, lock);
    }
    if (overlap) return res.status(409).json({ message: 'Selected slot is not available' });

    if (session) session.startTransaction();
    let booking = await Booking.create([{
      userId,
      advocateId,
      slot: { start, end },
      status: 'pending',
      amount: req.body.amount || adv.consultationFee || 0,
      currency: req.body.currency || 'INR'
    }], { session });

    let created = booking[0];

    if (session) await session.commitTransaction();

    bus.emit('booking.created', created);

    res.status(201).json({ booking: created });
  } catch (err) {
    if (session) await session.abortTransaction().catch(()=>null);
    next(err);
  } finally {
    if (session) session.endSession();
  }
}

async function listBookings(req, res, next) {
  try {
    let { advocateId, page = 1, limit = 20 } = req.query;
    let skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    let filter = {};
    if (req.user.role === 'admin' && advocateId) {
      filter.advocateId = advocateId;
    } else {
      filter.userId = req.user.id;
    }

    let [bookings, total] = await Promise.all([
      Booking.find(filter).sort({ 'slot.start': -1 }).skip(skip).limit(parseInt(limit, 10)).lean(),
      Booking.countDocuments(filter)
    ]);

    res.json({ bookings, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    next(err);
  }
}

async function cancelBooking(req, res, next) {
  try {
    let id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });

    let booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    let caller = req.user;
    let isOwner = booking.userId.toString() === caller.id;
    let isAdvocate = booking.advocateId.toString() === caller.id;
    if (!isOwner && caller.role !== 'admin' && !isAdvocate) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    booking.status = 'cancelled';
    await booking.save();

    bus.emit('booking.cancelled', booking);

    res.json({ booking });
  } catch (err) {
    next(err);
  }
}

async function confirmBooking(req, res, next) {
  try {
    let id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });

    let booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    let payment = await PaymentRecord.create({
      bookingId: booking._id,
      userId: booking.userId,
      amount: booking.amount || 0,
      currency: booking.currency,
      provider: 'simulated',
      status: 'succeeded'
    });

    booking.status = 'confirmed';
    booking.paymentId = payment._id;
    await booking.save();

    bus.emit('payment.succeeded', payment);
    bus.emit('booking.confirmed', booking);

    res.json({ booking, payment });
  } catch (err) {
    next(err);
  }
}

module.exports = { createBooking, listBookings, cancelBooking, confirmBooking };
