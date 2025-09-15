let express = require('express');
let router = express.Router();
let caseController = require('../controllers/case.controller');
let auth = require('../middlewares/auth.middleware');
let { permit } = require('../middlewares/rbac.middleware');

router.post('/', auth,permit('user'), caseController.createCase);

router.get('/:id', auth, caseController.getCase);

router.get('/', auth,permit('admin'), caseController.listCases);

module.exports = router;
