let express = require('express');
let router = express.Router();
let bookingController = require('../controllers/booking.controller');
let auth = require('../middlewares/auth.middleware');
let { permit } = require('../middlewares/rbac.middleware');

router.post('/', auth, bookingController.createBooking);

router.get('/', auth,permit('admin'), bookingController.listBookings);

router.put('/:id/cancel', auth, bookingController.cancelBooking);

router.post('/:id/confirm', auth,  permit('admin','advocate'), bookingController.confirmBooking);

module.exports = router;
