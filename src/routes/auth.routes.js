let express = require('express');
let router = express.Router();
let authController = require('../controllers/auth.controller');
let authMiddleware = require('../middlewares/auth.middleware');

router.post('/register', authController.register);
router.post('/login', authController.login);

router.get('/me', authMiddleware, authController.me);

module.exports = router;
