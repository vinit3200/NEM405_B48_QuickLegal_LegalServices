let express = require('express');
let router = express.Router();
let advocateController = require('../controllers/advocate.controller');
let auth = require('../middlewares/auth.middleware');
let { permit } = require('../middlewares/rbac.middleware');

router.get('/', advocateController.listAdvocates);

router.get('/:id', advocateController.getAdvocate);

router.post('/', auth, advocateController.createAdvocate);

router.put('/:id', auth, permit('advocate', 'admin'), advocateController.updateAdvocate);

module.exports = router;
