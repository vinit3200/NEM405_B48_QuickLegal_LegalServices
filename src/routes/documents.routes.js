let express = require('express');
let router = express.Router();
let documentController = require('../controllers/document.controller');
let auth = require('../middlewares/auth.middleware');
let upload = require('../middlewares/upload.middleware');

router.post('/upload', auth, upload.single('file'), documentController.uploadFile);

router.post('/generate-pdf', auth, documentController.generatePdf);

router.get('/', auth, documentController.listDocuments);

module.exports = router;
