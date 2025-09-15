let express = require('express');
let router = express.Router();
let userController = require('../controllers/user.controller');
let auth = require('../middlewares/auth.middleware');
let { permit } = require('../middlewares/rbac.middleware');

router.get('/:id', auth, userController.getProfile); 

router.put('/me', auth, userController.updateProfile);

router.get('/', auth, permit('admin'), userController.listUsers);

module.exports = router;
