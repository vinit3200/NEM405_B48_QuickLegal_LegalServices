let express = require('express');
let router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./users.routes'));
router.use('/advocates', require('./advocates.routes'));
router.use('/bookings', require('./bookings.routes'));
router.use('/documents', require('./documents.routes'));
router.use('/cases', require('./cases.routes'));

router.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

module.exports = router;
