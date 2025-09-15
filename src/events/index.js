'use strict';

let EventEmitter = require('events');
let bus = new EventEmitter();

let logger = require('../utils/logger');
let notificationService = require('../services/notification.service');
let { getClient: getRedis } = require('../db/redis');
let Booking = require('../models/Booking.model');
let User = require('../models/User.model');

bus.setMaxListeners(50);

function runAsync(handler, ...args) {
  Promise.resolve()
    .then(() => handler(...args))
    .catch((err) => {
      logger.error('Event listener error', { err: err && err.message ? err.message : String(err) });
    });
}

bus.on('booking.created', (booking) => {
  runAsync(async () => {
    try {
      logger.info('Event: booking.created', { bookingId: booking._id?.toString(), advocateId: booking.advocateId?.toString(), userId: booking.userId?.toString() });

      let [user, advocateUser] = await Promise.all([
        User.findById(booking.userId).select('email name').lean().catch(() => null),
        (async () => {
          let adv = await require('../models/Advocate.model').findById(booking.advocateId).lean().catch(()=>null);
          if (!adv) return null;
          return User.findById(adv.userId).select('email name').lean().catch(()=>null);
        })()
      ]);

      if (user && user.email) {
        await notificationService.sendEmail({
          to: user.email,
          subject: 'Booking received - QuickLegal',
          text: `Your booking (id: ${booking._id}) is created and pending confirmation.`
        }).catch(e => logger.warn('Email to user failed', { err: e?.message }));
      }

      if (advocateUser && advocateUser.email) {
        await notificationService.sendEmail({
          to: advocateUser.email,
          subject: 'New booking request - QuickLegal',
          text: `You have a new booking request (id: ${booking._id}). Please confirm or reject it.`
        }).catch(e => logger.warn('Email to advocate failed', { err: e?.message }));
      }

      if (booking.advocateId) {
        await notificationService.sendWebsocketToUser(booking.advocateId.toString(), {
          type: 'booking.request',
          bookingId: booking._id,
          slot: booking.slot,
          message: 'New booking request'
        }).catch(() => null);
      }
    } catch (err) {
      logger.error('Error in booking.created listener', { err: err.message });
    }
  });
});

bus.on('payment.succeeded', (payment) => {
  runAsync(async () => {
    try {
      logger.info('Event: payment.succeeded', { paymentId: payment._id?.toString(), bookingId: payment.bookingId?.toString() });

      if (!payment.bookingId) return;

      let booking = await Booking.findById(payment.bookingId).catch(() => null);
      if (!booking) {
        logger.warn('payment.succeeded: booking not found', { bookingId: payment.bookingId?.toString() });
        return;
      }

      if (booking.status !== 'confirmed') {
        booking.status = 'confirmed';
        booking.paymentId = payment._id;
        await booking.save();
      }

      let [user, adv] = await Promise.all([
        User.findById(booking.userId).select('email name').lean().catch(()=>null),
        require('../models/Advocate.model').findById(booking.advocateId).lean().catch(()=>null)
      ]);

      let advocateUser = null;
      if (adv && adv.userId) {
        advocateUser = await User.findById(adv.userId).select('email name').lean().catch(()=>null);
      }

      if (user && user.email) {
        await notificationService.sendEmail({
          to: user.email,
          subject: 'Payment successful - Booking confirmed',
          text: `Your payment for booking ${booking._id} was successful. Booking is confirmed.`
        }).catch(e => logger.warn('Email to user failed', { err: e?.message }));
      }

      if (advocateUser && advocateUser.email) {
        await notificationService.sendEmail({
          to: advocateUser.email,
          subject: 'Booking confirmed',
          text: `Booking ${booking._id} has been confirmed and paid.`
        }).catch(e => logger.warn('Email to advocate failed', { err: e?.message }));
      }

      await notificationService.sendWebsocketToUser(booking.userId?.toString(), { type: 'booking.confirmed', bookingId: booking._id }).catch(()=>null);
      if (booking.advocateId) await notificationService.sendWebsocketToUser(booking.advocateId?.toString(), { type: 'booking.confirmed', bookingId: booking._id }).catch(()=>null);
    } catch (err) {
      logger.error('Error in payment.succeeded listener', { err: err.message });
    }
  });
});

bus.on('booking.confirmed', (booking) => {
  runAsync(async () => {
    try {
      logger.info('Event: booking.confirmed', { bookingId: booking._id?.toString() });
      await notificationService.sendWebsocketToUser(booking.userId?.toString(), { type: 'booking.confirmed', bookingId: booking._id }).catch(()=>null);
      await notificationService.sendWebsocketToUser(booking.advocateId?.toString(), { type: 'booking.confirmed', bookingId: booking._id }).catch(()=>null);
    } catch (err) {
      logger.error('Error in booking.confirmed listener', { err: err.message });
    }
  });
});

bus.on('booking.cancelled', (booking) => {
  runAsync(async () => {
    try {
      logger.info('Event: booking.cancelled', { bookingId: booking._id?.toString() });
      await notificationService.sendWebsocketToUser(booking.userId?.toString(), { type: 'booking.cancelled', bookingId: booking._id }).catch(()=>null);
      await notificationService.sendWebsocketToUser(booking.advocateId?.toString(), { type: 'booking.cancelled', bookingId: booking._id }).catch(()=>null);

      let user = await User.findById(booking.userId).select('email name').lean().catch(()=>null);
      if (user && user.email) {
        await notificationService.sendEmail({
          to: user.email,
          subject: 'Booking cancelled',
          text: `Your booking ${booking._id} was cancelled.`
        }).catch(()=>null);
      }
    } catch (err) {
      logger.error('Error in booking.cancelled listener', { err: err.message });
    }
  });
});

bus.on('document.created', (payload) => {
  runAsync(async () => {
    try {
      let { userId, docId } = payload || {};
      logger.info('Event: document.created', { docId: docId?.toString(), userId: userId?.toString() });
      if (!userId) return;

      await notificationService.sendWebsocketToUser(userId.toString(), { type: 'document.created', docId }).catch(()=>null);

      let user = await User.findById(userId).select('email name').lean().catch(()=>null);
      if (user && user.email) {
        await notificationService.sendEmail({
          to: user.email,
          subject: 'Your document is ready',
          text: `Your document (id: ${docId}) is ready for download in your QuickLegal account.`
        }).catch(()=>null);
      }
    } catch (err) {
      logger.error('Error in document.created listener', { err: err.message });
    }
  });
});

bus.on('document.uploaded', (payload) => {
  runAsync(async () => {
    try {
      let { userId, docId } = payload || {};
      logger.info('Event: document.uploaded', { docId: docId?.toString(), userId: userId?.toString() });
      if (!userId) return;
      await notificationService.sendWebsocketToUser(userId.toString(), { type: 'document.uploaded', docId }).catch(()=>null);
    } catch (err) {
      logger.error('Error in document.uploaded listener', { err: err.message });
    }
  });
});

bus.on('user.created', (payload) => {
  runAsync(async () => {
    try {
      let { userId, email } = payload || {};
      logger.info('Event: user.created', { userId: userId?.toString(), email });
      if (!email) return;
      await notificationService.sendEmail({
        to: email,
        subject: 'Welcome to QuickLegal',
        text: 'Thanks for signing up for QuickLegal. You can now search advocates, book consultations, and generate documents.'
      }).catch(()=>null);
    } catch (err) {
      logger.error('Error in user.created listener', { err: err.message });
    }
  });
});

bus.on('user.logged_in', (payload) => {
  runAsync(async () => {
    try {
      let { userId } = payload || {};
      if (!userId) return;
      logger.info('Event: user.logged_in', { userId: userId?.toString() });

      try {
        let redis = await getRedis().catch(() => null);
        if (redis) {
          let key = `user:last_login:${userId.toString()}`;
          await redis.set(key, Date.now().toString(), { EX: 7 * 24 * 3600 });
        }
      } catch (e) {
        logger.warn('Failed to write last login to Redis', { err: e?.message });
      }
    } catch (err) {
      logger.error('Error in user.logged_in listener', { err: err.message });
    }
  });
});

module.exports = bus;
