let PaymentRecord = require('../models/PaymentRecord.model');
let bus = require('../events/index');
let logger = require('../utils/logger');

async function simulatePayment({ bookingId, userId, amount = 0, currency = 'INR', provider = 'simulated' } = {}) {
  let payment = await PaymentRecord.create({
    bookingId: bookingId || null,
    userId,
    amount,
    currency,
    provider,
    providerPaymentId: `sim-${Date.now()}`,
    status: 'succeeded',
    metadata: {}
  });

  bus.emit('payment.succeeded', payment);
  logger.info('Simulated payment created', { paymentId: payment._id.toString(), bookingId });
  return payment;
}

async function createPending({ bookingId, userId, amount = 0, currency = 'INR', provider = 'simulated' } = {}) {
  let record = await PaymentRecord.create({
    bookingId: bookingId || null,
    userId,
    amount,
    currency,
    provider,
    status: 'pending',
    metadata: {}
  });
  return record;
}

module.exports = { simulatePayment, createPending };
